import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ── Users ──────────────────────────────────────────────

export async function createOrUpdateUser(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      correctPredictions: 0,
      totalPredictions: 0,
      accuracyPercentage: 0,
      totalPoints: 0,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  }
}

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// ── Matches ────────────────────────────────────────────

export async function getMatches() {
  const q = query(collection(db, 'matches'), orderBy('kickoffTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createMatch(data) {
  return addDoc(collection(db, 'matches'), {
    ...data,
    status: 'upcoming',
    result: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateMatch(matchId, data) {
  await updateDoc(doc(db, 'matches', matchId), data);
}

export async function deleteMatch(matchId) {
  // Delete the match doc
  await deleteDoc(doc(db, 'matches', matchId));
  // Also delete all predictions for this match
  const q = query(collection(db, 'predictions'), where('matchId', '==', matchId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (snap.docs.length > 0) await batch.commit();
}

// Add participant predictions to an existing match + set its result
export async function addPredictionsToExistingMatch(matchId, kickoffTime, winner, participants) {
  const batch = writeBatch(db);

  // Update match result and status
  batch.update(doc(db, 'matches', matchId), {
    result: { winner },
    status: 'completed',
  });

  // Resolve / create users then add predictions
  const userPromises = participants.map(async (p) => {
    const name = p.name.trim();
    const existing = await findUserByName(name);
    let userId;
    if (existing) {
      userId = existing.uid || existing.id;
    } else {
      const uid = 'participant_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      userId = uid;
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        uid,
        displayName: name,
        email: null,
        photoURL: null,
        correctPredictions: 0,
        totalPredictions: 0,
        accuracyPercentage: 0,
        totalPoints: 0,
        isManual: true,
        createdAt: serverTimestamp(),
      });
    }
    return { userId, prediction: p.prediction, predictionTime: p.predictionTime || null };
  });

  const resolved = await Promise.all(userPromises);

  resolved.forEach(({ userId, prediction, predictionTime }) => {
    const predRef = doc(collection(db, 'predictions'));
    batch.set(predRef, {
      userId,
      matchId,
      prediction,
      predictionTime: predictionTime || null,
      timestamp: serverTimestamp(),
    });
  });

  await batch.commit();
}

// ── Predictions ────────────────────────────────────────

export async function getPrediction(userId, matchId) {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId),
    where('matchId', '==', matchId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function savePrediction(userId, matchId, prediction) {
  const existing = await getPrediction(userId, matchId);
  if (existing) {
    await updateDoc(doc(db, 'predictions', existing.id), {
      prediction,
      timestamp: serverTimestamp(),
    });
  } else {
    await addDoc(collection(db, 'predictions'), {
      userId,
      matchId,
      prediction,
      timestamp: serverTimestamp(),
    });
  }
}

export async function getUserPredictions(userId) {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllPredictions() {
  const snap = await getDocs(collection(db, 'predictions'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deletePrediction(predictionId) {
  await deleteDoc(doc(db, 'predictions', predictionId));
}

// ── Find user by display name ──────────────────────────

export async function findUserByName(displayName) {
  const snap = await getDocs(collection(db, 'users'));
  const match = snap.docs.find(
    (d) => d.data().displayName?.toLowerCase() === displayName.toLowerCase()
  );
  return match ? { id: match.id, ...match.data() } : null;
}

// ── Import Historical Match ────────────────────────────

export async function importHistoricalMatch({ matchNumber, homeTeam, awayTeam, kickoffTime, winner, participants }) {
  const batch = writeBatch(db);

  // Create the match doc
  const matchRef = doc(collection(db, 'matches'));
  batch.set(matchRef, {
    matchNumber: matchNumber || null,
    homeTeam,
    awayTeam,
    kickoffTime,
    status: 'completed',
    result: { winner },
    createdAt: serverTimestamp(),
  });

  // For each participant, ensure a user doc exists then add their prediction
  const userPromises = participants.map(async (p) => {
    const name = p.name.trim();
    const existing = await findUserByName(name);
    let userId;
    if (existing) {
      userId = existing.uid || existing.id;
    } else {
      const uid = 'participant_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      userId = uid;
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        uid,
        displayName: name,
        email: null,
        photoURL: null,
        correctPredictions: 0,
        totalPredictions: 0,
        accuracyPercentage: 0,
        totalPoints: 0,
        isManual: true,
        createdAt: serverTimestamp(),
      });
    }
    return { userId, prediction: p.prediction, predictionTime: p.predictionTime || null };
  });

  const resolvedParticipants = await Promise.all(userPromises);

  // Add prediction docs
  resolvedParticipants.forEach(({ userId, prediction, predictionTime }) => {
    const predRef = doc(collection(db, 'predictions'));
    batch.set(predRef, {
      userId,
      matchId: matchRef.id,
      prediction,
      predictionTime: predictionTime || null,
      timestamp: serverTimestamp(),
    });
  });

  await batch.commit();
  return matchRef.id;
}

// ── Leaderboard Recalculation ──────────────────────────

export async function recalculateLeaderboard() {
  const [matches, predictions, users] = await Promise.all([
    getMatches(),
    getAllPredictions(),
    getAllUsers(),
  ]);

  const completedMatches = matches.filter(
    (m) => m.status === 'completed' && m.result
  );

  const resultMap = {};
  completedMatches.forEach((m) => {
    resultMap[m.id] = m.result.winner;
  });

  const completedIds = new Set(completedMatches.map((m) => m.id));

  const statsMap = {};
  users.forEach((u) => {
    statsMap[u.uid || u.id] = {
      correctPredictions: 0,
      totalPredictions: 0,
      totalPoints: 0,
    };
  });

  // Build kickoff time map for late-entry checks
  const kickoffMap = {};
  completedMatches.forEach((m) => {
    kickoffMap[m.id] = m.kickoffTime?.toDate ? m.kickoffTime.toDate() : new Date(m.kickoffTime);
  });

  predictions.forEach((p) => {
    if (!completedIds.has(p.matchId)) return;

    // Skip predictions made at or after kickoff
    if (p.predictionTime) {
      const predTime = p.predictionTime.toDate ? p.predictionTime.toDate() : new Date(p.predictionTime);
      const kickoff = kickoffMap[p.matchId];
      if (kickoff && predTime >= kickoff) return;
    }

    const uid = p.userId;
    if (!statsMap[uid]) {
      statsMap[uid] = { correctPredictions: 0, totalPredictions: 0, totalPoints: 0 };
    }
    statsMap[uid].totalPredictions += 1;
    if (resultMap[p.matchId] === p.prediction) {
      statsMap[uid].correctPredictions += 1;
      statsMap[uid].totalPoints += 3;
    }
  });

  const batch = writeBatch(db);
  Object.entries(statsMap).forEach(([uid, stats]) => {
    const accuracy =
      stats.totalPredictions > 0
        ? Math.round((stats.correctPredictions / stats.totalPredictions) * 1000) / 10
        : 0;
    batch.update(doc(db, 'users', uid), {
      correctPredictions: stats.correctPredictions,
      totalPredictions: stats.totalPredictions,
      totalPoints: stats.totalPoints,
      accuracyPercentage: accuracy,
    });
  });

  await batch.commit();
}

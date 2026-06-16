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
  arrayUnion,
  arrayRemove,
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
    // Don't overwrite displayName — user may have customised it on their profile
    await updateDoc(ref, {
      photoURL: user.photoURL,
      email: user.email,
    });
  }
}

export async function updateUserProfile(uid, data) {
  const allowed = ['displayName', 'phone', 'favoriteTeam', 'favoritePlayer'];
  const update = {};
  allowed.forEach((k) => { if (data[k] !== undefined) update[k] = data[k]; });
  await updateDoc(doc(db, 'users', uid), update);
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
  const q = query(collection(db, 'matches'), orderBy('matchNumber', 'asc'));
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

// ── Public Landing Data ────────────────────────────────

export async function getPublicData() {
  const [matches, allPredictions, allUsers] = await Promise.all([
    getMatches(),
    getAllPredictions(),
    getAllUsers(),
  ]);

  // Aggregate crowd prediction counts per match
  const predCounts = {};
  allPredictions.forEach((p) => {
    if (!predCounts[p.matchId]) predCounts[p.matchId] = {};
    predCounts[p.matchId][p.prediction] = (predCounts[p.matchId][p.prediction] || 0) + 1;
  });

  const realUsers = allUsers.filter((u) => !u.isManual && u.email);
  const visibleUsers = allUsers.filter((u) => !u.hideFromLeaderboard);

  return {
    matches,
    predCounts,
    totalUsers: realUsers.length,
    totalPredictions: allPredictions.length,
    activeMatches: matches.filter((m) => m.status === 'live' || m.status === 'upcoming').length,
    leaderboard: visibleUsers,
  };
}

// Lightweight public fetch — no auth required (matches + predictions only)
export async function getPublicMatches() {
  const [matches, allPredictions] = await Promise.all([
    getMatches(),
    getAllPredictions(),
  ]);
  const predCounts = {};
  allPredictions.forEach((p) => {
    if (!predCounts[p.matchId]) predCounts[p.matchId] = {};
    predCounts[p.matchId][p.prediction] = (predCounts[p.matchId][p.prediction] || 0) + 1;
  });
  return { matches, predCounts };
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

// ── Groups ─────────────────────────────────────────────
export async function getGroups() {
  const snap = await getDocs(query(collection(db, 'groups'), orderBy('name', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createGroup(name) {
  return addDoc(collection(db, 'groups'), { name: name.trim(), createdAt: serverTimestamp() });
}

export async function updateGroup(groupId, data) {
  await updateDoc(doc(db, 'groups', groupId), data);
}

export async function deleteGroup(groupId) {
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function assignUserToGroup(userId, groupId) {
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayUnion(groupId) });
}

export async function removeUserFromGroup(userId, groupId) {
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayRemove(groupId) });
}

export async function setGroupAdmin(groupId, userId, isAdmin) {
  await updateDoc(doc(db, 'groups', groupId), {
    adminIds: isAdmin ? arrayUnion(userId) : arrayRemove(userId),
  });
}

export async function getGroupMembers(groupId) {
  const q = query(collection(db, 'users'), where('groupIds', 'array-contains', groupId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Merge Users ────────────────────────────────────────
// Transfers all sourceUid predictions to targetUid, then deletes sourceUid.
// If target already has a prediction for a match, the source prediction is dropped.
export async function mergeUsers(sourceUid, targetUid) {
  const [sourcePreds, targetPreds] = await Promise.all([
    getUserPredictions(sourceUid),
    getUserPredictions(targetUid),
  ]);

  const targetMatchIds = new Set(targetPreds.map((p) => p.matchId));
  const batch = writeBatch(db);

  sourcePreds.forEach((p) => {
    const ref = doc(db, 'predictions', p.id);
    if (targetMatchIds.has(p.matchId)) {
      batch.delete(ref);
    } else {
      batch.update(ref, { userId: targetUid });
    }
  });

  batch.delete(doc(db, 'users', sourceUid));

  await batch.commit();
  await recalculateLeaderboard();
}

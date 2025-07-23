const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {setLogLevel} = require('firebase/firestore');

(async () => {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: {rules: '../firestore.rules'}
  });
  setLogLevel('error');

  const unauth = testEnv.unauthenticatedContext();
  const alice = testEnv.authenticatedContext('alice');
  const bob = testEnv.authenticatedContext('bob');
  const admin = testEnv.authenticatedContext('admin', {isAdmin: true});

  // Setup: create user profiles
  await alice.firestore().collection('users').doc('alice').set({isAdmin: false, banned: false});
  await bob.firestore().collection('users').doc('bob').set({isAdmin: false, banned: false});
  await admin.firestore().collection('users').doc('admin').set({isAdmin: true, banned: false});

  // 1. Bob reading Alice's quest history should fail
  await bob.firestore().collection('user_quests').doc('alice').collection('quests').doc('q1').set({});
  await assertFails(bob.firestore().collection('user_quests').doc('alice').collection('quests').get());

  // 2. Admin reading reports should succeed
  await admin.firestore().collection('reports').doc('r1').set({});
  await assertSucceeds(admin.firestore().collection('reports').get());

  // 3. Banned user writing should fail
  await alice.firestore().collection('users').doc('alice').update({banned: true});
  await assertFails(alice.firestore().collection('custom_quests').add({creatorId: 'alice', isPublic: false}));

  // 4. Anonymous read from quests should succeed
  await assertSucceeds(unauth.firestore().collection('quests').get());

  await testEnv.cleanup();
})();

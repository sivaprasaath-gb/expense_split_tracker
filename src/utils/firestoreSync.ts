import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { 
  AppState, 
  Transaction, 
  Subscription, 
  Category, 
  Friend, 
  SplitExpense, 
  SplitGroup,
  PendingTransaction
} from '../types';
import { DEFAULT_CATEGORIES } from './storage';

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfile(uid: string, email: string, displayName?: string, photoURL?: string) {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email: email || '',
      displayName: displayName || email.split('@')[0] || 'User',
      photoURL: photoURL || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Setup real-time listeners for all user data collections
 */
export function subscribeToUserData(
  uid: string,
  callbacks: {
    onSettings: (settings: { appName?: string; currency?: string; budgetLimit?: number; theme?: 'dark' | 'light'; smsWebhookKey?: string }) => void;
    onTransactions: (txs: Transaction[]) => void;
    onCategories: (cats: Category[]) => void;
    onSubscriptions: (subs: Subscription[]) => void;
    onFriends: (friends: Friend[]) => void;
    onSplitGroups: (groups: SplitGroup[]) => void;
    onSplitExpenses: (expenses: SplitExpense[]) => void;
    onPendingTransactions?: (pending: PendingTransaction[]) => void;
  }
): () => void {
  const unsubs: (() => void)[] = [];

  // 1. Settings listener
  const settingsPath = `users/${uid}/settings/main`;
  const unsubSettings = onSnapshot(
    doc(db, 'users', uid, 'settings', 'main'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callbacks.onSettings({
          appName: data.appName,
          currency: data.currency,
          budgetLimit: data.budgetLimit,
          theme: data.theme,
          smsWebhookKey: data.smsWebhookKey,
          customWebhookServerUrl: data.customWebhookServerUrl,
        });
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, settingsPath);
    }
  );
  unsubs.push(unsubSettings);

  // 2. Transactions listener
  const txPath = `users/${uid}/transactions`;
  const unsubTx = onSnapshot(
    collection(db, 'users', uid, 'transactions'),
    (snap) => {
      const txs: Transaction[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        txs.push({
          id: d.id || docSnap.id,
          title: d.title || 'Untitled',
          amount: Number(d.amount) || 0,
          type: d.type === 'income' ? 'income' : 'expense',
          category: d.category || 'other',
          date: d.date || new Date().toISOString().slice(0, 10),
          note: d.note || '',
          paymentMethod: d.paymentMethod || 'Other',
          createdAt: Number(d.createdAt) || Date.now(),
        });
      });
      // Sort newest first
      txs.sort((a, b) => b.createdAt - a.createdAt);
      callbacks.onTransactions(txs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, txPath);
    }
  );
  unsubs.push(unsubTx);

  // 3. Categories listener
  const catPath = `users/${uid}/categories`;
  const unsubCat = onSnapshot(
    collection(db, 'users', uid, 'categories'),
    (snap) => {
      if (!snap.empty) {
        const cats: Category[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          cats.push({
            id: d.id || docSnap.id,
            name: d.name || 'Category',
            icon: d.icon || '🏷️',
            color: d.color || '#6366f1',
            budget: Number(d.budget) || 0,
          });
        });
        callbacks.onCategories(cats);
      } else {
        callbacks.onCategories(DEFAULT_CATEGORIES);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, catPath);
    }
  );
  unsubs.push(unsubCat);

  // 4. Subscriptions listener
  const subPath = `users/${uid}/subscriptions`;
  const unsubSub = onSnapshot(
    collection(db, 'users', uid, 'subscriptions'),
    (snap) => {
      const subs: Subscription[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        subs.push({
          id: d.id || docSnap.id,
          name: d.name || 'Subscription',
          amount: Number(d.amount) || 0,
          day: Number(d.day) || 1,
          category: d.category || 'bills',
          active: d.active !== false,
          notes: d.notes || '',
        });
      });
      callbacks.onSubscriptions(subs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, subPath);
    }
  );
  unsubs.push(unsubSub);

  // 5. Friends listener
  const friendsPath = `users/${uid}/friends`;
  const unsubFriends = onSnapshot(
    collection(db, 'users', uid, 'friends'),
    (snap) => {
      const friends: Friend[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        friends.push({
          id: d.id || docSnap.id,
          name: d.name || 'Friend',
          note: d.note || '',
          avatarColor: d.avatarColor || '#6366f1',
        });
      });
      callbacks.onFriends(friends);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, friendsPath);
    }
  );
  unsubs.push(unsubFriends);

  // 6. Split Groups listener
  const groupsPath = `users/${uid}/splitGroups`;
  const unsubGroups = onSnapshot(
    collection(db, 'users', uid, 'splitGroups'),
    (snap) => {
      const groups: SplitGroup[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        groups.push({
          id: d.id || docSnap.id,
          name: d.name || 'Group',
          description: d.description || '',
          icon: d.icon || '✈️',
          memberIds: Array.isArray(d.memberIds) ? d.memberIds : ['YOU'],
          status: d.status === 'closed' ? 'closed' : 'active',
          createdAt: Number(d.createdAt) || Date.now(),
          closedAt: d.closedAt ? Number(d.closedAt) : undefined,
        });
      });
      groups.sort((a, b) => b.createdAt - a.createdAt);
      callbacks.onSplitGroups(groups);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, groupsPath);
    }
  );
  unsubs.push(unsubGroups);

  // 7. Split Expenses listener
  const expensesPath = `users/${uid}/splitExpenses`;
  const unsubExpenses = onSnapshot(
    collection(db, 'users', uid, 'splitExpenses'),
    (snap) => {
      const expenses: SplitExpense[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        expenses.push({
          id: d.id || docSnap.id,
          groupId: d.groupId || undefined,
          title: d.title || 'Expense',
          amount: Number(d.amount) || 0,
          date: d.date || new Date().toISOString().slice(0, 10),
          paidBy: d.paidBy || 'YOU',
          paidByName: d.paidByName || 'You',
          shares: Array.isArray(d.shares) ? d.shares : [],
          note: d.note || '',
          isSettlement: Boolean(d.isSettlement),
        });
      });
      expenses.sort((a, b) => (b.date > a.date ? 1 : -1));
      callbacks.onSplitExpenses(expenses);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, expensesPath);
    }
  );
  unsubs.push(unsubExpenses);

  // 8. Pending Transactions listener (iPhone / CSV Sync Inbox)
  if (callbacks.onPendingTransactions) {
    const pendingPath = `users/${uid}/pendingTransactions`;
    const unsubPending = onSnapshot(
      collection(db, 'users', uid, 'pendingTransactions'),
      (snap) => {
        const pending: PendingTransaction[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          pending.push({
            id: d.id || docSnap.id,
            title: d.title || 'Debit Expense',
            amount: Number(d.amount) || 0,
            type: d.type === 'income' ? 'income' : 'expense',
            category: d.category || 'other',
            date: d.date || new Date().toISOString().slice(0, 10),
            note: d.note || '',
            paymentMethod: d.paymentMethod || 'UPI',
            source: d.source || 'iphone_shortcut',
            createdAt: Number(d.createdAt) || Date.now(),
            isSplit: Boolean(d.isSplit),
            splitGroupId: d.splitGroupId,
            splitWithMemberIds: d.splitWithMemberIds,
          });
        });
        // Sort newest first
        pending.sort((a, b) => b.createdAt - a.createdAt);
        callbacks.onPendingTransactions!(pending);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, pendingPath);
      }
    );
    unsubs.push(unsubPending);
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

/**
 * Save settings to Firestore
 */
export async function saveUserSettingsToFirestore(uid: string, settings: Partial<AppState>) {
  const path = `users/${uid}/settings/main`;
  try {
    const payload: Record<string, any> = {
      appName: settings.appName || 'VARAVU&SELAVU',
      currency: settings.currency || 'INR',
      budgetLimit: typeof settings.budgetLimit === 'number' ? settings.budgetLimit : 0,
      theme: settings.theme || 'dark',
      updatedAt: new Date().toISOString(),
    };
    if (settings.smsWebhookKey) {
      payload.smsWebhookKey = settings.smsWebhookKey;
    }
    if (typeof settings.customWebhookServerUrl === 'string') {
      payload.customWebhookServerUrl = settings.customWebhookServerUrl;
    }
    await setDoc(doc(db, 'users', uid, 'settings', 'main'), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Transaction CRUD
 */
export async function saveTransactionToFirestore(uid: string, tx: Transaction) {
  const path = `users/${uid}/transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'transactions', tx.id), {
      ...tx,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTransactionFromFirestore(uid: string, txId: string) {
  const path = `users/${uid}/transactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'transactions', txId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Category CRUD
 */
export async function saveCategoryToFirestore(uid: string, cat: Category) {
  const path = `users/${uid}/categories/${cat.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'categories', cat.id), {
      ...cat,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromFirestore(uid: string, catId: string) {
  const path = `users/${uid}/categories/${catId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'categories', catId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Subscription CRUD
 */
export async function saveSubscriptionToFirestore(uid: string, sub: Subscription) {
  const path = `users/${uid}/subscriptions/${sub.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'subscriptions', sub.id), {
      ...sub,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSubscriptionFromFirestore(uid: string, subId: string) {
  const path = `users/${uid}/subscriptions/${subId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'subscriptions', subId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Friend CRUD
 */
export async function saveFriendToFirestore(uid: string, friend: Friend) {
  const path = `users/${uid}/friends/${friend.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'friends', friend.id), {
      ...friend,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteFriendFromFirestore(uid: string, friendId: string) {
  const path = `users/${uid}/friends/${friendId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'friends', friendId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Split Group CRUD
 */
export async function saveSplitGroupToFirestore(uid: string, group: SplitGroup) {
  const path = `users/${uid}/splitGroups/${group.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'splitGroups', group.id), {
      ...group,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSplitGroupFromFirestore(uid: string, groupId: string) {
  const path = `users/${uid}/splitGroups/${groupId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splitGroups', groupId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Split Expense CRUD
 */
export async function saveSplitExpenseToFirestore(uid: string, expense: SplitExpense) {
  const path = `users/${uid}/splitExpenses/${expense.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'splitExpenses', expense.id), {
      ...expense,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSplitExpenseFromFirestore(uid: string, expenseId: string) {
  const path = `users/${uid}/splitExpenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splitExpenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Migrate local storage state to Firestore for a new user
 */
export async function migrateLocalStateToFirestore(uid: string, localState: AppState) {
  try {
    // 1. Settings
    await saveUserSettingsToFirestore(uid, localState);

    // 2. Categories
    for (const cat of localState.categories) {
      await saveCategoryToFirestore(uid, cat);
    }

    // 3. Transactions
    for (const tx of localState.transactions) {
      await saveTransactionToFirestore(uid, tx);
    }

    // 4. Subscriptions
    for (const sub of localState.subscriptions) {
      await saveSubscriptionToFirestore(uid, sub);
    }

    // 5. Friends
    for (const fr of localState.friends) {
      await saveFriendToFirestore(uid, fr);
    }

    // 6. Split Groups
    for (const gr of localState.splitGroups) {
      await saveSplitGroupToFirestore(uid, gr);
    }

    // 7. Split Expenses
    for (const exp of localState.splitExpenses) {
      await saveSplitExpenseToFirestore(uid, exp);
    }
  } catch (err) {
    console.error('Failed to migrate state to Firestore:', err);
  }
}

/**
 * Pending Transactions CRUD for iPhone / CSV Sync Inbox
 */
export async function savePendingTransactionToFirestore(uid: string, item: PendingTransaction) {
  const path = `users/${uid}/pendingTransactions/${item.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'pendingTransactions', item.id), {
      ...item,
      userId: uid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function batchSavePendingTransactionsToFirestore(uid: string, items: PendingTransaction[]) {
  if (!items.length) return;
  const path = `users/${uid}/pendingTransactions`;
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const ref = doc(db, 'users', uid, 'pendingTransactions', item.id);
      batch.set(ref, {
        ...item,
        userId: uid,
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePendingTransactionFromFirestore(uid: string, pendingId: string) {
  const path = `users/${uid}/pendingTransactions/${pendingId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'pendingTransactions', pendingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearAllPendingTransactionsFromFirestore(uid: string, items: PendingTransaction[]) {
  if (!items.length) return;
  const path = `users/${uid}/pendingTransactions`;
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const ref = doc(db, 'users', uid, 'pendingTransactions', item.id);
      batch.delete(ref);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}


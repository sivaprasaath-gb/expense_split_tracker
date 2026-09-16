import { Friend, SplitExpense, FriendBalance, SplitGroup } from '../types';

/**
 * Calculates bilateral balances between YOU and each friend.
 * Optionally filtered by groupId.
 * Returns:
 * - netBalance > 0: The friend owes YOU that amount.
 * - netBalance < 0: YOU owe the friend Math.abs(netBalance).
 * - netBalance === 0: Settled up.
 */
export function calculateBalances(
  friends: Friend[], 
  splitExpenses: SplitExpense[],
  groupId?: string
): {
  friendBalances: FriendBalance[];
  totalOwedToYou: number;
  totalYouOwe: number;
} {
  const balanceMap: Record<string, number> = {};

  friends.forEach(f => {
    balanceMap[f.id] = 0;
  });

  const relevantExpenses = splitExpenses.filter(expense => {
    if (!groupId || groupId === 'all') return true;
    if (groupId === 'ungrouped') return !expense.groupId;
    return expense.groupId === groupId;
  });

  relevantExpenses.forEach(expense => {
    const paidBy = expense.paidBy;

    expense.shares.forEach(share => {
      const debtor = share.personId;
      const shareAmount = Number(share.amount) || 0;

      if (paidBy === 'YOU' && debtor !== 'YOU') {
        // You paid for this friend -> Friend owes You
        balanceMap[debtor] = (balanceMap[debtor] || 0) + shareAmount;
      } else if (paidBy !== 'YOU' && debtor === 'YOU') {
        // Friend paid for You -> You owe Friend (net balance with friend decreases)
        balanceMap[paidBy] = (balanceMap[paidBy] || 0) - shareAmount;
      }
      // Note: If friend A paid for friend B, it does not affect YOUR personal balance.
    });
  });

  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  const friendBalances: FriendBalance[] = friends.map(friend => {
    const net = Math.round((balanceMap[friend.id] || 0) * 100) / 100;
    const owedToYou = net > 0 ? net : 0;
    const youOwe = net < 0 ? Math.abs(net) : 0;

    totalOwedToYou += owedToYou;
    totalYouOwe += youOwe;

    return {
      friend,
      netBalance: net,
      totalOwedToYou: owedToYou,
      totalYouOwe: youOwe,
    };
  });

  return {
    friendBalances,
    totalOwedToYou: Math.round(totalOwedToYou * 100) / 100,
    totalYouOwe: Math.round(totalYouOwe * 100) / 100,
  };
}

/**
 * Calculates a summary of metrics for a specific group
 */
export function getGroupSummary(
  group: SplitGroup,
  friends: Friend[],
  splitExpenses: SplitExpense[]
) {
  const groupExpenses = splitExpenses.filter(e => e.groupId === group.id);
  const totalSpend = groupExpenses
    .filter(e => !e.isSettlement)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Group members (friends that are in memberIds)
  const groupFriends = friends.filter(f => group.memberIds.includes(f.id));
  
  const { friendBalances, totalOwedToYou, totalYouOwe } = calculateBalances(
    groupFriends,
    groupExpenses,
    group.id
  );

  const netBalance = Math.round((totalOwedToYou - totalYouOwe) * 100) / 100;
  const isSettled = friendBalances.every(fb => fb.netBalance === 0);

  return {
    groupExpenses,
    totalSpend: Math.round(totalSpend * 100) / 100,
    expenseCount: groupExpenses.filter(e => !e.isSettlement).length,
    groupFriends,
    friendBalances,
    totalOwedToYou,
    totalYouOwe,
    netBalance,
    isSettled,
  };
}

/**
 * Generates a settlement expense object to balance a debt with a friend
 */
export function createSettlementExpense(
  friend: Friend,
  netBalance: number,
  currencySymbol: string,
  customAmount?: number,
  customDate?: string,
  paymentMethod: string = 'UPI',
  customNote?: string,
  groupId?: string
): SplitExpense {
  const amount = customAmount !== undefined && customAmount > 0 
    ? Math.round(customAmount * 100) / 100 
    : Math.round(Math.abs(netBalance) * 100) / 100;
    
  // Local YYYY-MM-DD
  const localDate = customDate || new Date().toLocaleDateString('en-CA');

  if (netBalance > 0) {
    // Friend owes You: Friend pays You
    return {
      id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      title: `Settlement: ${friend.name} paid You`,
      amount,
      date: localDate,
      paidBy: friend.id,
      paidByName: friend.name,
      shares: [
        {
          personId: 'YOU',
          personName: 'You',
          amount,
        },
      ],
      note: customNote || `Settled via ${paymentMethod} (${currencySymbol}${amount})`,
      isSettlement: true,
    };
  } else {
    // You owe Friend: You pay Friend
    return {
      id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      title: `Settlement: You paid ${friend.name}`,
      amount,
      date: localDate,
      paidBy: 'YOU',
      paidByName: 'You',
      shares: [
        {
          personId: friend.id,
          personName: friend.name,
          amount,
        },
      ],
      note: customNote || `Settled via ${paymentMethod} (${currencySymbol}${amount})`,
      isSettlement: true,
    };
  }
}


import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTransactions, getAccounts } from '@/lib/teller'

function isYesterday(date: Date): boolean {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  // Convert both dates to local midnight for comparison
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  yesterday.setHours(0, 0, 0, 0)
  
  return compareDate.getTime() === yesterday.getTime()
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all user's active accounts and their enrollments
    const { data: accounts, error: accountsError } = await supabase
      .from('teller_accounts')
      .select(`
        *,
        enrollment:teller_enrollments!inner(
          access_token,
          enrollment_id
        )
      `)
      .eq('user_id', user.id)

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return NextResponse.json(
        { message: 'Error fetching accounts' },
        { status: 500 }
      )
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        dailySpend: '$0.00',
        weeklySpend: '$0.00',
        monthlySpend: '$0.00',
        thisWeekSpend: '$0.00',
        thisMonthSpend: '$0.00'
      })
    }

    console.log(`Processing ${accounts.length} accounts for user ${user.id}`)

    // Calculate date ranges in local time
    const now = new Date()
    
    // Yesterday (full day in local time)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)
    
    // Last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    // Last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    
    // This week (starting Monday)
    const thisWeekStart = new Date()
    thisWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    thisWeekStart.setHours(0, 0, 0, 0)
    
    // This month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    thisMonthStart.setHours(0, 0, 0, 0)

    // Initialize spending totals
    let dailyTotal = 0
    let weeklyTotal = 0
    let monthlyTotal = 0
    let thisWeekTotal = 0
    let thisMonthTotal = 0
    
    // Track separate totals for pending vs posted
    let pendingTotal = 0
    let postedTotal = 0

    // Track transaction statuses for debugging
    const statusCounts = {
      posted: 0,
      pending: 0,
      other: 0
    }
    const pendingTransactions = []

    // Track processed enrollments to avoid duplicates
    const processedEnrollments = new Set<string>()

    // Fetch transactions for each account
    for (const account of accounts) {
      try {
        // Skip if we've already processed this enrollment
        if (processedEnrollments.has(account.enrollment_id)) {
          continue
        }

        console.log(`Fetching transactions for account: ${account.account_id} (${account.account_type})`)

        const transactions = await getTransactions(
          account.enrollment.access_token,
          account.account_id,
          {
            from: thirtyDaysAgo.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0]
          }
        )

        console.log(`Found ${transactions.length} transactions for account ${account.account_id}`)

        // Process transactions
        for (const tx of transactions) {
          const txDate = new Date(tx.date)
          const amount = Number(tx.amount)
          
          // Track transaction status
          if (tx.status === 'posted') {
            statusCounts.posted++
            if (amount < 0) {
              const spendAmount = Math.abs(amount)
              postedTotal += spendAmount
              
              // Add to period totals
              if (isYesterday(txDate)) dailyTotal += spendAmount
              if (txDate >= sevenDaysAgo) weeklyTotal += spendAmount
              if (txDate >= thirtyDaysAgo) monthlyTotal += spendAmount
              if (txDate >= thisWeekStart) thisWeekTotal += spendAmount
              if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) thisMonthTotal += spendAmount
            }
          } else if (tx.status === 'pending') {
            statusCounts.pending++
            console.log(`Found pending transaction: ${tx.description}, amount: ${amount}, date: ${tx.date}`)
            
            // Extract just the day from the transaction date (it's in format YYYY-MM-DD)
            const txDay = parseInt(tx.date.split('-')[2])
            const todayDay = now.getDate()
            
            // Skip if it's today's pending transaction
            if (txDay === todayDay) {
              console.log(`Skipping today's (${todayDay}) pending transaction: ${tx.description}`)
              continue
            }
            
            const spendAmount = amount
            pendingTotal += spendAmount
            
            // Check if it's from yesterday
            if (txDay === todayDay - 1) {
              dailyTotal += spendAmount
              console.log(`Added yesterday's pending: ${tx.description}, $${spendAmount}`)
            }
            
            // Add to other period totals (all pending transactions that aren't today)
            weeklyTotal += spendAmount
            monthlyTotal += spendAmount
            if (txDay >= thisWeekStart.getDate()) {
              thisWeekTotal += spendAmount
            }
            thisMonthTotal += spendAmount
            
            pendingTransactions.push({
              description: tx.description,
              date: tx.date,
              amount: spendAmount,
              status: tx.status
            })
          } else {
            statusCounts.other++
            console.log(`Found transaction with unexpected status: ${tx.status}`)
          }
        }

        // Mark this enrollment as processed
        processedEnrollments.add(account.enrollment_id)
      } catch (error) {
        console.error('Error processing account:', error)
        continue
      }
    }

    // Log transaction status breakdown
    console.log('Transaction status counts:', statusCounts)
    console.log('Pending total amount:', pendingTotal.toFixed(2))
    console.log('Posted total amount:', postedTotal.toFixed(2))
    console.log('COMBINED TOTAL:', (pendingTotal + postedTotal).toFixed(2))
    
    if (pendingTransactions.length > 0) {
      console.log(`${pendingTransactions.length} pending transactions included in totals:`, pendingTransactions)
    } else {
      console.log('No pending transactions found')
    }

    // Format the totals as currency strings
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    }

    // Log final totals
    console.log('Final spending totals (INCLUDING PENDING TRANSACTIONS):')
    console.log('Daily:', dailyTotal)
    console.log('Weekly:', weeklyTotal)
    console.log('Monthly:', monthlyTotal)
    console.log('This week:', thisWeekTotal)
    console.log('This month:', thisMonthTotal)

    return NextResponse.json({
      dailySpend: formatCurrency(dailyTotal),
      weeklySpend: formatCurrency(weeklyTotal),
      monthlySpend: formatCurrency(monthlyTotal),
      thisWeekSpend: formatCurrency(thisWeekTotal),
      thisMonthSpend: formatCurrency(thisMonthTotal)
    })
  } catch (error) {
    console.error('Error in spending summary route:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Grid, Paper, 
  Box, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow 
} from '@mui/material';
import { calculateAccountAverage, getDecryptedRunningTotal, calculateLiabilities } from '../utils/BudgetCalculations';
import axios from 'axios';

// Define the account information structure for TypeScript
interface AccountInfo {
  name: string;
  amount: number;
}

// Define the projection structure for TypeScript
interface ProjectionData {
  month: number;
  startingValue: number;
  totalExpenses: number;
  totalIncome: number;
  remaining: number;
}


const BudgetPage: React.FC = () => {
  const [assets, setAssets] = useState<AccountInfo[]>([]);
  const [expenses, setExpenses] = useState<AccountInfo[]>([]);
  const [income, setIncome] = useState<AccountInfo[]>([]);
  const [liabilities, setLiabilities] = useState<AccountInfo[]>([]);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
  const [totalStartingValue, setTotalStartingValue] = useState<number>(0);
  const [totalRemainingValue, setTotalRemainingValue] = useState<number>(0);
  const [budgetProjections, setBudgetProjections] = useState<ProjectionData[]>([]);


  // Retrieve all accounts and separate them into respective categories
  const fetchAndCategorizeAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts');
      const accounts = response.data;

      // Categorize accounts by basket and initialize with 0 amount
      const categorizedAssets: AccountInfo[] = [];
      const categorizedExpenses: AccountInfo[] = [];
      const categorizedIncome: AccountInfo[] = [];
      const categorizedLiabilities: AccountInfo[] = [];

      accounts.forEach((account: any) => {
        const accountInfo: AccountInfo = { name: account.name, amount: 0 };
        switch (account.basket) {
          case 'asset':
            categorizedAssets.push(accountInfo);
            break;
          case 'expense':
            categorizedExpenses.push(accountInfo);
            break;
          case 'income':
            categorizedIncome.push(accountInfo);
            break;
          case 'liability':
            categorizedLiabilities.push(accountInfo);
            break;
          default:
            break;
        }
      });

      setAssets(categorizedAssets);
      setExpenses(categorizedExpenses);
      setIncome(categorizedIncome);
      setLiabilities(categorizedLiabilities);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // Function to calculate total assets
  const calculateTotalAssets = async () => {
    let assetsTotal = 0;
    const updatedAssets = await Promise.all(
      assets.map(async (asset) => {
        const assetAmount = await getDecryptedRunningTotal(asset.name);
        assetsTotal += assetAmount;
        return { ...asset, amount: parseFloat(assetAmount.toFixed(2)) };
      })
    );
    setAssets(updatedAssets);
    setTotalAssets(assetsTotal);
  };

  // Function to calculate total expenses
  const calculateTotalExpenses = async () => {
    let expensesTotal = 0;
    const updatedExpenses = await Promise.all(
      expenses.map(async (expense) => {
        const expenseAmount = await calculateAccountAverage(expense.name);
        expensesTotal += expenseAmount;
        return { ...expense, amount: parseFloat(expenseAmount.toFixed(2)) };
      })
    );
    setExpenses(updatedExpenses);
    setTotalExpenses(expensesTotal);
  };

  // Function to calculate total income
  const calculateTotalIncome = async () => {
    let incomeTotal = 0;
    const updatedIncome = await Promise.all(
      income.map(async (incomeAccount) => {
        const incomeAmount = await calculateAccountAverage(incomeAccount.name);
        incomeTotal += incomeAmount;
        return { ...incomeAccount, amount: parseFloat(incomeAmount.toFixed(2)) };
      })
    );
    setIncome(updatedIncome);
    setTotalIncome(incomeTotal);
  };

  // Function to calculate total liabilities
  const calculateTotalLiabilities = async () => {
    let liabilitiesTotal = 0;
    const updatedLiabilities = await Promise.all(
      liabilities.map(async (liability) => {
        const liabilityAmount = await calculateLiabilities(liability.name);
        liabilitiesTotal += liabilityAmount;
        return { ...liability, amount: parseFloat(liabilityAmount.toFixed(2)) };
      })
    );
    setLiabilities(updatedLiabilities);
    setTotalLiabilities(liabilitiesTotal);
  };

  // Initial data fetch and setup on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchAndCategorizeAccounts();
      await calculateTotalAssets();
      await calculateTotalExpenses();
      await calculateTotalIncome();
      await calculateTotalLiabilities();
    };
    fetchData();
  }, []);

  const renderAccountList = (accounts: AccountInfo[], total: number) => (
    <Paper elevation={2} style={{ padding: '10px', marginBottom: '20px', width: '100%' }}>
      {accounts.map((account) => (
        <Grid container justifyContent="space-between" key={account.name}>
          <Typography variant="body1">{account.name}</Typography>
          <Typography variant="body1">${account.amount.toFixed(2)}</Typography>
        </Grid>
      ))}
      <Box mt={2} pt={2} borderTop="1px solid #ccc">
        <Typography variant="h6">Total: ${total.toFixed(2)}</Typography>
      </Box>
    </Paper>
  );

  const calculateMonthlyProjections = useCallback(
    (months: number) => {
      let startingValue = totalAssets;
      let monthlyRemaining = startingValue;
  
      const projections: ProjectionData[] = [];
  
      for (let i = 0; i < months; i++) {
        const totalExpensesForMonth = totalExpenses;
        const totalIncomeForMonth = totalIncome;
  
        monthlyRemaining = monthlyRemaining - totalExpensesForMonth + totalIncomeForMonth;
  
        // Store the starting and remaining values for each month
        projections.push({
          month: i + 1,
          startingValue: startingValue,
          totalExpenses: totalExpensesForMonth,
          totalIncome: totalIncomeForMonth,
          remaining: monthlyRemaining,
        });
  
        // Update starting value for the next month
        startingValue = monthlyRemaining;
      }
  
      // Update state with projections
      setBudgetProjections(projections);
      setTotalStartingValue(projections[0].startingValue);
      setTotalRemainingValue(projections[months - 1].remaining);
    },
    [totalAssets, totalExpenses, totalIncome] // dependencies
  );
  
  

  useEffect(() => {
    if (totalAssets && totalExpenses && totalIncome) {
      calculateMonthlyProjections(12);
    }
  }, [totalAssets, totalExpenses, totalIncome]);
  

  return (
    <Grid container spacing={3}>
      {/* Budget Overview Section */}
      <Grid item xs={12}>
        <Typography variant="h4" align="center">Budget Overview</Typography>
      </Grid>
      <Grid item xs={3}>
        <Typography variant="h6" align="center">Expenses</Typography>
        {renderAccountList(expenses, totalExpenses)}
      </Grid>
      <Grid item xs={3}>
        <Typography variant="h6" align="center">Income</Typography>
        {renderAccountList(income, totalIncome)}
      </Grid>
      <Grid item xs={3}>
        <Typography variant="h6" align="center">Liabilities</Typography>
        {renderAccountList(liabilities, totalLiabilities)}
      </Grid>
      <Grid item xs={3}>
        <Typography variant="h6" align="center">Assets</Typography>
        {renderAccountList(assets, totalAssets)}
      </Grid>
  
      {/* Budget Projections Section */}
      <Grid item xs={12} style={{ marginTop: '40px' }}>
        <Typography variant="h4" align="center">Budget Projections</Typography>
      </Grid>
      <Grid item xs={12}>
        <TableContainer component={Paper} style={{ marginTop: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Starting Value</TableCell>
                <TableCell>Total Expenses</TableCell>
                <TableCell>Remaining Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgetProjections.map((projection, index) => (
                <TableRow key={index}>
                  <TableCell>{projection.month}</TableCell>
                  <TableCell>${projection.startingValue.toFixed(2)}</TableCell>
                  <TableCell>${projection.totalExpenses.toFixed(2)}</TableCell>
                  <TableCell>${projection.remaining.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
};

export default BudgetPage;

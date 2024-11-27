import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  calculateAccountAverage,
  getDecryptedRunningTotal,
  calculateLiabilities,
} from '../utils/BudgetCalculations';
import axios from 'axios';

interface AccountInfo {
  name: string;
  amount: number;
}

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

  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        console.log('Fetching and categorizing accounts...');
        const response = await axios.get('http://localhost:5000/api/accounts');
        console.log('Accounts response:', response.data);
        const accounts = response.data;

        // Categorize accounts by basket
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

        // Update states with categorized accounts
        setAssets(categorizedAssets);
        setExpenses(categorizedExpenses);
        setIncome(categorizedIncome);
        setLiabilities(categorizedLiabilities);
        console.log('Accounts categorized:', {
          assets: categorizedAssets,
          expenses: categorizedExpenses,
          income: categorizedIncome,
          liabilities: categorizedLiabilities,
        });

        // Perform calculations after state updates
        console.log('Calculating total assets...');
        let assetsTotal = 0;
        const updatedAssets = await Promise.all(
          categorizedAssets.map(async (asset) => {
            const assetAmount = await getDecryptedRunningTotal(asset.name);
            assetsTotal += assetAmount;
            return { ...asset, amount: parseFloat(assetAmount.toFixed(2)) };
          })
        );
        setAssets(updatedAssets);
        setTotalAssets(assetsTotal);
        console.log('Total assets calculated:', assetsTotal);

        console.log('Calculating total expenses...');
        let expensesTotal = 0;
        const updatedExpenses = await Promise.all(
          categorizedExpenses.map(async (expense) => {
            const expenseAmount = await calculateAccountAverage(expense.name);
            expensesTotal += expenseAmount;
            return { ...expense, amount: parseFloat(expenseAmount.toFixed(2)) };
          })
        );
        setExpenses(updatedExpenses);
        setTotalExpenses(expensesTotal);
        console.log('Total expenses calculated:', expensesTotal);

        console.log('Calculating total income...');
        let incomeTotal = 0;
        const updatedIncome = await Promise.all(
          categorizedIncome.map(async (incomeAccount) => {
            const incomeAmount = await calculateAccountAverage(incomeAccount.name);
            incomeTotal += incomeAmount;
            return { ...incomeAccount, amount: parseFloat(incomeAmount.toFixed(2)) };
          })
        );
        setIncome(updatedIncome);
        setTotalIncome(incomeTotal);
        console.log('Total income calculated:', incomeTotal);

        console.log('Calculating total liabilities...');
        let liabilitiesTotal = 0;
        const updatedLiabilities = await Promise.all(
          categorizedLiabilities.map(async (liability) => {
            const liabilityAmount = await calculateLiabilities(liability.name);
            liabilitiesTotal += liabilityAmount;
            return { ...liability, amount: parseFloat(liabilityAmount.toFixed(2)) };
          })
        );
        setLiabilities(updatedLiabilities);
        setTotalLiabilities(liabilitiesTotal);
        console.log('Total liabilities calculated:', liabilitiesTotal);
      } catch (error) {
        console.error('Error during data fetching or calculations:', error);
      }
    };

    fetchAndProcessData();
  }, []);

  const renderAccountList = (accounts: AccountInfo[], total: number) => {
    console.log('Rendering account list for:', accounts);
    return (
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
  };

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
    [totalAssets, totalExpenses, totalIncome]
  );

  useEffect(() => {
    if (totalAssets && totalExpenses && totalIncome) {
      console.log('Calculating monthly projections...');
      calculateMonthlyProjections(12);
      console.log('Monthly projections calculated:', budgetProjections);
    } else {
      console.log('Skipping projections; missing values:', {
        totalAssets,
        totalExpenses,
        totalIncome,
      });
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

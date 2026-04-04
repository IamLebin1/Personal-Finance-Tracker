import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
var config = require('../config/Config');

const screenWidth = Dimensions.get('window').width;
const chartColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

const AnalyticsScreen = ({ navigation }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const _prepareChartData = (list: any[]) => {
    var categoryTotals: any = {};
    var chartArray: any[] = [];
    var categories = [];
    var i = 0;

    for (i = 0; i < list.length; i++) {
      if (list[i].type === 'expense') {
        if (!categoryTotals[list[i].category]) {
          categoryTotals[list[i].category] = 0;
        }
        categoryTotals[list[i].category] = categoryTotals[list[i].category] + Number(list[i].amount);
      }
    }

    categories = Object.keys(categoryTotals);

    for (i = 0; i < categories.length; i++) {
      chartArray.push({
        name: categories[i],
        population: categoryTotals[categories[i]],
        color: chartColors[i % chartColors.length],
        legendFontColor: '#0F172A',
        legendFontSize: 12,
      });
    }

    if (chartArray.length === 0) {
      chartArray.push({
        name: 'No spending',
        population: 1,
        color: '#CBD5E1',
        legendFontColor: '#0F172A',
        legendFontSize: 12,
      });
    }

    setChartData(chartArray);
  };

  const _load = () => {
    fetch(config.settings.serverPath + '/api/transactions')
      .then(response => response.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTransactions(list);
        _prepareChartData(list);
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to load transactions.');
      });
  };

  const _edit = () => {
    if (!transactionId || amount === '' || category === '') {
      Alert.alert('Error', 'Please select a transaction first.');
      return;
    }

    fetch(config.settings.serverPath + '/api/transactions/' + transactionId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        category: category,
      }),
    })
      .then(respond => respond.json())
      .then(respondJson => {
        if (respondJson.affected > 0) {
          Alert.alert('Success', 'Transaction updated successfully.');
          _load();
        } else {
          Alert.alert('Error', 'No transaction was updated.');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to update transaction.');
      });
  };

  const _pickTransaction = (item: any) => {
    setTransactionId(String(item.id || item._id || ''));
    setAmount(String(item.amount || ''));
    setCategory(String(item.category || ''));
  };

  useEffect(() => {
    _load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerKicker}>Analytics</Text>
          <Text style={styles.headerTitle}>See where your money goes</Text>
          <Text style={styles.headerSubtitle}>Tap a transaction below to edit amount and category.</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('TransactionsStack')} style={styles.navButton}>
          <Text style={styles.navButtonText}>Go To Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Amount"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Category"
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity style={styles.updateButton} onPress={_edit}>
          <Text style={styles.updateButtonText}>Update Transaction</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <PieChart
          accessor="population"
          backgroundColor="transparent"
          chartConfig={{
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            color: () => '#0F172A',
          }}
          data={chartData}
          height={screenWidth * 0.64}
          paddingLeft="12"
          absolute
          width={screenWidth - 32}
        />
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <FlatList
          data={transactions}
          keyExtractor={item => String(item.id || item._id)}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.row} onPress={() => _pickTransaction(item)}>
              <View style={styles.rowLeft}>
                <View style={[styles.swatch, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <Text style={styles.rowLabel}>{item.category}</Text>
              </View>
              <Text style={styles.rowValue}>RM {Number(item.amount || 0).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No transaction data yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
  },
  headerKicker: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  navButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#052E16',
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    flex: 1,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  rowLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  rowValue: {
    color: '#334155',
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnalyticsScreen;

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Analytics() {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Financial Analytics</Text>

        <View style={styles.weekCard}>
          <Text style={styles.cardSub}>Weekly Spending</Text>
          <Text style={styles.weekValue}>$1,245.00</Text>
          <Text style={styles.trend}>+12% vs last week</Text>

          <View style={styles.fakeChart}>
            <View style={[styles.point, { left: '8%', top: 44 }]} />
            <View style={[styles.point, { left: '28%', top: 26 }]} />
            <View style={[styles.point, { left: '48%', top: 34 }]} />
            <View style={[styles.point, { left: '68%', top: 18 }]} />
            <View style={[styles.point, { left: '88%', top: 29 }]} />
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Category Distribution</Text>

          <View style={styles.ringWrap}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>$4.5k</Text>
              </View>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#3554ff' }]} />
            <Text style={styles.legendLabel}>Food & Dining</Text>
            <Text style={styles.legendPct}>40%</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#7849ff' }]} />
            <Text style={styles.legendLabel}>Housing</Text>
            <Text style={styles.legendPct}>30%</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#ff4a7f' }]} />
            <Text style={styles.legendLabel}>Entertainment</Text>
            <Text style={styles.legendPct}>30%</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090a1f',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    color: '#f5f7ff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  weekCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
    marginBottom: 12,
  },
  cardSub: {
    color: '#8f95ca',
    fontSize: 13,
  },
  weekValue: {
    color: '#f8f8ff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  trend: {
    color: '#20ce8f',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  fakeChart: {
    height: 70,
    borderRadius: 14,
    backgroundColor: '#0f1130',
    borderWidth: 1,
    borderColor: '#272a66',
  },
  point: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#815fff',
  },
  breakdownCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c306f',
    backgroundColor: '#121437',
    padding: 14,
  },
  breakdownTitle: {
    color: '#f0f2ff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  ringOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 10,
    borderColor: '#724eff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1d4b',
  },
  ringInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#121437',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#8790cf',
    fontSize: 12,
  },
  totalValue: {
    color: '#f4f6ff',
    fontSize: 20,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    color: '#d5d9ff',
    fontSize: 13,
  },
  legendPct: {
    color: '#dfe2ff',
    fontSize: 13,
    fontWeight: '600',
  },
});

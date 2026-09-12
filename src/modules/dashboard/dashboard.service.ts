import { dashboardRepo } from './dashboard.repo.js';

export const dashboardService = {
  async getDashboardData(
    organizationId: string,
    outletId: string | null,
    query: {
      range: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
      from?: string | undefined;
      to?: string | undefined;
    }
  ) {
    const dates = this.resolveDateRange(query.range, query.from, query.to);
    const metrics = await dashboardRepo.getMetricsAggregation(
      organizationId,
      outletId,
      dates.from,
      dates.to
    );

    // Hitung Periode Sebelumnya untuk Tren %
    const prevDates = this.getPreviousPeriodDates(dates.from, dates.to);
    const prevMetrics = await dashboardRepo.getMetricsAggregation(
      organizationId,
      outletId,
      prevDates.from,
      prevDates.to
    );

    const omsetNet = metrics.omsetNetIdr;
    const cogs = metrics.cogsIdr;
    const opex = metrics.opexIdr;
    const nettProfit = omsetNet - cogs - opex;

    const cogsRatioPct = omsetNet > 0 ? Number(((cogs / omsetNet) * 100).toFixed(1)) : 0;
    const nettMarginPct = omsetNet > 0 ? Number(((nettProfit / omsetNet) * 100).toFixed(1)) : 0;
    const wastePct = omsetNet > 0 ? Number(((metrics.wasteIdr / omsetNet) * 100).toFixed(2)) : 0;

    const omsetTrendPct = this.calcTrendPct(metrics.omsetNetIdr, prevMetrics.omsetNetIdr);
    const cogsTrendPct = this.calcTrendPct(metrics.cogsIdr, prevMetrics.cogsIdr);
    const profitTrendPct = this.calcTrendPct(
      nettProfit,
      prevMetrics.omsetNetIdr - prevMetrics.cogsIdr - prevMetrics.opexIdr
    );

    const chart = await dashboardRepo.getMonthlyChartData(organizationId, outletId);
    const lowStockRaw = await dashboardRepo.getLowStockItems(organizationId, outletId);

    const lowStock = lowStockRaw.map((item) => ({
      ...item,
      status: item.currentQty <= 0 ? 'critical' : ('low' as const),
      burnRatePerDay: 1.2,
    }));

    const menuPerformanceRaw = await dashboardRepo.getMenuPerformance(organizationId, outletId);
    const menuPerformance = menuPerformanceRaw.map((item) => {
      const marginPct =
        item.sellingPriceIdr > 0
          ? Number((((item.sellingPriceIdr - item.cogsIdr) / item.sellingPriceIdr) * 100).toFixed(1))
          : 0;
      return {
        ...item,
        marginPct,
      };
    });

    const recentSales = await dashboardRepo.getRecentSales(organizationId, outletId);

    return {
      kpis: {
        omsetNetIdr: omsetNet,
        omsetGrossIdr: metrics.omsetGrossIdr,
        trxCount: metrics.trxCount,
        cogsIdr: cogs,
        cogsRatioPct,
        nettProfitIdr: nettProfit,
        nettMarginPct,
        criticalSkuCount: lowStock.filter((i) => i.status === 'critical').length,
        wasteIdr: metrics.wasteIdr,
        wastePct,
        trends: {
          omsetPct: omsetTrendPct,
          cogsPct: cogsTrendPct,
          profitPct: profitTrendPct,
        },
      },
      chart,
      lowStock,
      menuPerformance,
      recentSales,
    };
  },

  resolveDateRange(range: string, from?: string, to?: string) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (range === 'yesterday') {
      const y = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
      return { from: y, to: y };
    }
    if (range === 'week') {
      const w = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return { from: w, to: todayStr };
    }
    if (range === 'month') {
      const m = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return { from: m, to: todayStr };
    }
    if (range === 'custom' && from && to) {
      return { from, to };
    }
    return { from: todayStr, to: todayStr };
  },

  getPreviousPeriodDates(fromStr: string, toStr: string) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const diffMs = to.getTime() - from.getTime();

    const prevTo = new Date(from.getTime() - 24 * 3600 * 1000);
    const prevFrom = new Date(prevTo.getTime() - diffMs);

    return {
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
  },

  calcTrendPct(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  },
};

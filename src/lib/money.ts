export const roundMoney = (val: number): number => Math.round(val);

export const calculateWac = (
  oldQty: number,
  oldAvgCost: number,
  inboundQty: number,
  inboundCost: number
): number => {
  if (oldQty <= 0) return inboundCost;
  const totalQty = oldQty + inboundQty;
  if (totalQty <= 0) return 0;
  const totalCost = oldQty * oldAvgCost + inboundQty * inboundCost;
  return Number((totalCost / totalQty).toFixed(4));
};

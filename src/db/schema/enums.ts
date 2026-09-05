import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'disabled']);
export const planCodeEnum = pgEnum('plan_code', ['free_trial', 'starter', 'growth', 'pro', 'business']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'expired']);
export const registerBusinessTypeEnum = pgEnum('register_business_type', ['restaurant', 'retail', 'service']);
export const outletBusinessTypeEnum = pgEnum('outlet_business_type', [
  'coffee_bakery',
  'restaurant',
  'warung',
  'retail',
  'catering',
  'food_manufacture',
]);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'staff']);
export const staffRoleEnum = pgEnum('staff_role', [
  'store_manager',
  'head_barista',
  'barista',
  'cashier',
  'cook',
  'helper',
]);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract']);
export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'dairy',
  'coffee_bean',
  'syrup',
  'packaging',
  'flavor_powder',
  'other',
]);
export const productKindEnum = pgEnum('product_kind', ['made_to_order', 'finished_good', 'pre_order']);
export const stockItemTypeEnum = pgEnum('stock_item_type', ['ingredient', 'finished_good']);
export const movementTypeEnum = pgEnum('movement_type', [
  'purchase_in',
  'adjustment_in',
  'adjustment_out',
  'sale_out',
  'sale_void_in',
  'transfer_out',
  'transfer_in',
  'opname',
  'waste_out',
]);
export const transferStatusEnum = pgEnum('transfer_status', ['in_transit', 'completed', 'cancelled']);
export const opnameStatusEnum = pgEnum('opname_status', ['pending_review', 'approved', 'rejected']);
export const wasteReasonEnum = pgEnum('waste_reason', ['expired', 'damaged', 'trial_fail', 'lost']);
export const orderTypeEnum = pgEnum('order_type', ['dine_in', 'takeaway', 'delivery']);
export const paymentMethodEnum = pgEnum('payment_method', ['qris', 'cash', 'debit', 'bank_transfer']);
export const saleStatusEnum = pgEnum('sale_status', ['paid', 'pending', 'cancelled']);
export const expenseCategoryEnum = pgEnum('expense_category', [
  'raw_material',
  'packaging',
  'operational',
  'salary',
  'utilities',
  'equipment',
  'transport',
  'other',
]);
export const payStatusEnum = pgEnum('pay_status', ['paid', 'unpaid', 'credit']);
export const shiftNameEnum = pgEnum('shift_name', ['morning', 'evening']);
export const shiftStatusEnum = pgEnum('shift_status', ['open', 'balanced', 'variance']);
export const uomEnum = pgEnum('uom', [
  'ml',
  'gram',
  'kg',
  'pcs',
  'liter',
  'botol',
  'karton',
  'pouch',
  'pack',
  'orang',
  'bulan',
]);
export const recipeComponentTypeEnum = pgEnum('recipe_component_type', ['ingredient', 'product']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['register', 'email_change']);

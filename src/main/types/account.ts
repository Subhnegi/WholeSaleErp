/**
 * Account and Account Group Type Definitions for Main Process
 */

export interface AccountGroup {
  id: string;
  name: string;
  parentGroupId?: string;
  level: number;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
  synced?: boolean;
  lastSyncedAt?: Date;
  
  // Optional populated relations
  parentGroup?: AccountGroup;
  subGroups?: AccountGroup[];
  accounts?: Account[];
}

export interface Account {
  id: string;
  accountName: string;
  code?: string;
  accountGroupId: string;
  companyId: string;
  openingBalance: number;
  drCr: 'Dr' | 'Cr';
  area?: string;
  srNo?: string;
  crLimit?: number;
  nameLang?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  panNo?: string;
  mobile1?: string;
  mobile2?: string;
  bankName1?: string;
  accountNo1?: string;
  bankName2?: string;
  accountNo2?: string;
  contactPerson?: string;
  ledgerFolioNo?: string;
  auditUpto?: string;
  maintainBillByBillBalance: boolean;
  photo?: string;
  createdAt?: Date;
  updatedAt?: Date;
  synced?: boolean;
  lastSyncedAt?: Date;
  
  // Optional populated relations
  accountGroup?: AccountGroup;
}

export interface AccountGroupCreateInput {
  name: string;
  parentGroupId?: string;
  companyId: string;
}

export interface AccountCreateInput {
  accountName: string;
  code?: string;
  accountGroupId: string;
  companyId: string;
  openingBalance?: number;
  drCr?: 'Dr' | 'Cr';
  area?: string;
  srNo?: string;
  crLimit?: number;
  nameLang?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  panNo?: string;
  mobile1?: string;
  mobile2?: string;
  bankName1?: string;
  accountNo1?: string;
  bankName2?: string;
  accountNo2?: string;
  contactPerson?: string;
  ledgerFolioNo?: string;
  auditUpto?: string;
  maintainBillByBillBalance?: boolean;
  photo?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

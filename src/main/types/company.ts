/**
 * Company Type Definitions for Main Process
 */

export interface Company {
  id: string;
  companyName: string;
  printName?: string;
  printNameLang?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  mobile1?: string;
  mobile2?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  billTitle?: string;
  userId: string;
  companyPassword?: string;
  
  // Financial Year fields (embedded)
  fyStartDate: string | Date;
  fyEndDate: string | Date;
  fyLabel: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

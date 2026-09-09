import * as parts from './parts';
import * as purchaseOrders from './purchaseOrders';
import * as partners from './partners';
import * as locations from './locations';
import * as users from './users';
import * as reports from './reports';

export const dal = {
  parts,
  purchaseOrders,
  partners,
  locations,
  users,
  reports,
};

export type { DalResult, DalError } from './utils';

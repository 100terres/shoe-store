import uuid from 'uuid/v4';
import { of } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { catchError, map, mergeMap, bufferTime } from 'rxjs/operators';
import { combineEpics, ofType } from 'redux-observable';
import {
  INVENTORY_GLOBAL_REQUEST,
  INVENTORY_GLOBAL_SUCCESS,
  INVENTORY_CHANGE_LISTEN,
  INVENTORY_CHANGE_LOG_REQUEST,
  inventoryGlobalSuccess,
  inventoryGlobalFailure,
  inventoryChangeReceived,
  inventoryChangeFailure,
  inventoryChangeListen,
  inventoryChangeLogFailure,
  inventoryChangeLogSuccess,
  INVENTORY_CHANGE_RECEIVED,
  inventoryMonitoredNumberOfSales,
} from './inventoryActions';
import graphqlCall from '../../../libs/observables/graphqlCall';

const inventoryGlobal = action$ =>
  action$.pipe(
    ofType(INVENTORY_GLOBAL_REQUEST),
    mergeMap(() =>
      graphqlCall({
        query: `{
          globalInventory {
            storeId
            inventory {
              shoeId
              quantity
              sold
            }
          }
        }`,
      }).pipe(
        map(({ data }) => inventoryGlobalSuccess(data.globalInventory)),
        catchError(error => of(inventoryGlobalFailure(error))),
      ),
    ),
  );

const inventoryChangeLog = action$ =>
  action$.pipe(
    ofType(INVENTORY_CHANGE_LOG_REQUEST),
    mergeMap(() =>
      graphqlCall({
        query: `{
          inventoryLogs(limit: 50) {
            id
            model
            inventory
            store
          }
        }`,
      }).pipe(
        map(({ data }) => inventoryChangeLogSuccess(data.inventoryLogs)),
        catchError(error => of(inventoryChangeLogFailure(error))),
      ),
    ),
  );

const startListenInventoryChange = action$ =>
  action$.pipe(
    ofType(INVENTORY_GLOBAL_SUCCESS),
    map(() => inventoryChangeListen()),
  );

const listenInventoryChange = action$ =>
  action$.pipe(
    ofType(INVENTORY_CHANGE_LISTEN),
    mergeMap(() =>
      // TODO: move url to environment variable
      webSocket('ws://localhost:8080/').pipe(
        map(({ store, model, inventory }) =>
          inventoryChangeReceived({ id: uuid(), store, model, inventory }),
        ),
        catchError(error => of(inventoryChangeFailure(error))),
      ),
    ),
  );

const monitorNumberOfSalesPerTime = action$ =>
  action$.pipe(
    ofType(INVENTORY_CHANGE_RECEIVED),
    bufferTime(5 * 1000),
    map(buffer =>
      inventoryMonitoredNumberOfSales(
        uuid(),
        buffer.length,
        Number(Date.now()),
      ),
    ),
  );

export default combineEpics(
  inventoryGlobal,
  inventoryChangeLog,
  monitorNumberOfSalesPerTime,
  startListenInventoryChange,
  listenInventoryChange,
);

import { UnsafeEventStoreFactory } from "../types/UnsafeEventStoreFactory";
import { UnsafeEventStore } from "../types/UnsafeEventStore";

import { EventStoreFactory } from "../types/EventStoreFactory";
import { EventStore } from "../types/EventStore";

import { RBACEventStoreFactory } from "../types/RBACEventStoreFactory";
import { RBACEventStore } from "../types/RBACEventStore";

import { W3 } from "soltsice";

import { StoreAdapter } from "../Store/StoreAdapter";

import { ReadModel } from "../Store/ReadModel";

import { IReadModelState, IReadModelAdapter, IReadModel } from "../Store/ReadModel/ReadModelTypes";

import FactoryReadModel from "./ReadModel";

import { Store } from "../Store";

export namespace Factory {
  export type GenericFactory = UnsafeEventStoreFactory | EventStoreFactory | RBACEventStoreFactory;

  export enum FactoryTypes {
    UnsafeEventStoreFactory,
    EventStoreFactory,
    RBACEventStoreFactory
  }

  /**
   * Factory typeClassMapper
   */
  export const typeClassMapper = (name: FactoryTypes) => {
    switch (name) {
      case FactoryTypes.UnsafeEventStoreFactory:
        return UnsafeEventStoreFactory;
      case FactoryTypes.RBACEventStoreFactory:
        return RBACEventStoreFactory;
      default:
        return EventStoreFactory;
    }
  };

  export const factoryTypeToStoreTypeMapper = (name: FactoryTypes) => {
    switch (name) {
      case FactoryTypes.UnsafeEventStoreFactory:
        return Store.StoreTypes.UnsafeEventStore;
      case FactoryTypes.RBACEventStoreFactory:
        return Store.StoreTypes.RBACEventStore;
      default:
        return Store.StoreTypes.EventStore;
    }
  };

  export const getStoreClassFromFactoryInstance = (factory: GenericFactory): any => {
    if (factory instanceof EventStoreFactory) {
      return EventStore;
    }
    if (factory instanceof UnsafeEventStoreFactory) {
      return UnsafeEventStore;
    }
    if (factory instanceof RBACEventStoreFactory) {
      return RBACEventStore;
    }
    throw new Error("factory is not of known type. unsafe... ");
  };

  /**
   * Factory create
   */
  export const create = async (
    type: FactoryTypes,
    web3: any,
    fromAddress: string
  ): Promise<GenericFactory> => {
    W3.Default = web3;
    const factoryClass = typeClassMapper(type);
    const instance = await factoryClass.New(W3.TC.txParamsDefaultDeploy(fromAddress), {
      _multisig: fromAddress
    });
    return instance;
  };

  /**
   * Factory createStore
   */
  export const createStore = async (
    factory: GenericFactory,
    adapter: StoreAdapter,
    web3: any,
    fromAddress: string
  ) => {
    W3.Default = web3;
    const receipt = await factory.createEventStore(W3.TC.txParamsDefaultDeploy(fromAddress));
    const events = await adapter.extractEventsFromLogs(receipt.logs);
    const storeClass = getStoreClassFromFactoryInstance(factory);
    const store = await storeClass.At(events[0].payload.address);
    return store;
  };

  /**
   * Factory getReadModel
   */
  export const getReadModel = async (
    factory: GenericFactory,
    adapter: StoreAdapter,
    readModelAdapter: IReadModelAdapter,
    web3: any,
    fromAddress: string
  ) => {

    let state: IReadModelState = JSON.parse(JSON.stringify(FactoryReadModel.initialState));

    state.contractAddress = factory.address
    state.readModelStoreKey = `${state.readModelType}:${state.contractAddress}`

    let factoryReadModel = new ReadModel(
      readModelAdapter,
      FactoryReadModel.reducer,
      state
    );

    let changes = await factoryReadModel.sync(factory as any, adapter, web3, fromAddress);

    return factoryReadModel;
  };
}

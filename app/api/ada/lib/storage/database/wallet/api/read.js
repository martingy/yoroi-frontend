// @flow

import type {
  lf$Database,
  lf$Transaction,
} from 'lovefield';

import * as Tables from '../tables';
import type {
  PublicDeriverRow,
  ConceptualWalletRow, LastSyncInfoRow, HwWalletMetaRow,
} from '../tables';
import type { KeyDerivationRow, KeyRow, } from '../../primitives/tables';
import { GetKeyForDerivation } from '../../primitives/api/read';
import {
  getRowFromKey, StaleStateError,
} from '../../utils';

export class GetConceptualWallet {
  static ownTables = Object.freeze({
    [Tables.ConceptualWalletSchema.name]: Tables.ConceptualWalletSchema,
  });
  static depTables = Object.freeze({});

  static async get(
    db: lf$Database,
    tx: lf$Transaction,
    key: number,
  ): Promise<$ReadOnly<ConceptualWalletRow> | void> {
    const walletSchema = GetConceptualWallet.ownTables[Tables.ConceptualWalletSchema.name];
    return await getRowFromKey<ConceptualWalletRow>(
      db, tx,
      key,
      walletSchema.name,
      walletSchema.properties.ConceptualWalletId,
    );
  }
}

export class ReadLastSyncInfo {
  static ownTables = Object.freeze({
    [Tables.LastSyncInfoSchema.name]: Tables.LastSyncInfoSchema,
  });
  static depTables = Object.freeze({});

  static async getLastSyncInfo(
    db: lf$Database,
    tx: lf$Transaction,
    lastSyncInfoId: number,
  ): Promise<void | $ReadOnly<LastSyncInfoRow>> {
    return await getRowFromKey<LastSyncInfoRow>(
      db, tx,
      lastSyncInfoId,
      ReadLastSyncInfo.ownTables[Tables.LastSyncInfoSchema.name].name,
      ReadLastSyncInfo.ownTables[Tables.LastSyncInfoSchema.name].properties.LastSyncInfoId,
    );
  }
}

export class GetHwWalletMeta {
  static ownTables = Object.freeze({
    [Tables.HwWalletMetaSchema.name]: Tables.HwWalletMetaSchema,
  });
  static depTables = Object.freeze({});

  static async getMeta(
    db: lf$Database,
    tx: lf$Transaction,
    conceptualWalletId: number,
  ): Promise<void | $ReadOnly<HwWalletMetaRow>> {
    return await getRowFromKey<HwWalletMetaRow>(
      db, tx,
      conceptualWalletId,
      GetHwWalletMeta.ownTables[Tables.HwWalletMetaSchema.name].name,
      GetHwWalletMeta.ownTables[Tables.HwWalletMetaSchema.name].properties.ConceptualWalletId,
    );
  }
}


export class GetPublicDeriver {
  static ownTables = Object.freeze({
    [Tables.PublicDeriverSchema.name]: Tables.PublicDeriverSchema,
  });
  static depTables = Object.freeze({});

  static async get(
    db: lf$Database,
    tx: lf$Transaction,
    key: number,
  ): Promise<$ReadOnly<PublicDeriverRow> | void> {
    return await getRowFromKey<PublicDeriverRow>(
      db, tx,
      key,
      GetPublicDeriver.ownTables[Tables.PublicDeriverSchema.name].name,
      GetPublicDeriver.ownTables[Tables.PublicDeriverSchema.name].properties.PublicDeriverId,
    );
  }
}

export class GetKeyForPublicDeriver {
  static ownTables = Object.freeze({});
  static depTables = Object.freeze({
    GetKeyForDerivation,
    GetPublicDeriver,
  });

  static async get(
    db: lf$Database,
    tx: lf$Transaction,
    key: number,
    getPublic: boolean,
    getPrivate: boolean,
  ): Promise<{
    PublicDeriver: $ReadOnly<PublicDeriverRow>,
    KeyDerivation: $ReadOnly<KeyDerivationRow>,
    publicKey: $ReadOnly<KeyRow> | null | void,
    privateKey: $ReadOnly<KeyRow> | null | void,
  }> {
    const result = await GetKeyForPublicDeriver.depTables.GetPublicDeriver.get(
      db, tx,
      key,
    );
    if (result === undefined) {
      throw new StaleStateError('GetKeyForPublicDeriver::get GetPublicDeriver');
    }

    const derivationAndKey = await GetKeyForPublicDeriver.depTables.GetKeyForDerivation.get(
      db, tx,
      result.KeyDerivationId,
      getPublic,
      getPrivate,
    );

    return {
      ...derivationAndKey,
      PublicDeriver: result,
    };
  }
}

export class GetLastSyncForPublicDeriver {
  static ownTables = Object.freeze({});
  static depTables = Object.freeze({
    GetPublicDeriver,
    ReadLastSyncInfo,
  });

  static async forId(
    db: lf$Database,
    tx: lf$Transaction,
    publicDeriverId: number,
  ): Promise<$ReadOnly<LastSyncInfoRow>> {
    const pubDeriverRow = await GetLastSyncForPublicDeriver.depTables.GetPublicDeriver.get(
      db, tx,
      publicDeriverId
    );
    if (pubDeriverRow === undefined) {
      throw new StaleStateError('GetLastSyncForPublicDeriver::forId pubDeriverRow');
    }

    const syncInfo = await GetLastSyncForPublicDeriver.depTables.ReadLastSyncInfo.getLastSyncInfo(
      db, tx,
      pubDeriverRow.LastSyncInfoId
    );
    if (syncInfo === undefined) {
      throw new StaleStateError('GetLastSyncForPublicDeriver::forId syncInfo');
    }
    return syncInfo;
  }
}

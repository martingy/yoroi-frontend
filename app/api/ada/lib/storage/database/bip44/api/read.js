// @flow

import type {
  lf$Database,
  lf$Transaction,
} from 'lovefield';

import type {
  Bip44WrapperRow,
  PrivateDeriverRow,
} from '../tables';
import * as Tables from '../tables';

import {
  TableMap,
  allDerivationTables,
} from './utils';
import {
  getRowIn,
  getRowFromKey,
  StaleStateError,
} from '../../utils';

import type {
  KeyRow,
  KeyDerivationRow,
} from '../../primitives/tables';
import {
  KeyDerivationSchema,
} from '../../primitives/tables';
import { PublicDeriverSchema } from '../../wallet/tables';
import type { PublicDeriverRow } from '../../wallet/tables';
import { GetKeyForDerivation } from '../../primitives/api/read';

export class GetDerivationSpecific {
  static ownTables = Object.freeze({
    ...allDerivationTables,
    [KeyDerivationSchema.name]: KeyDerivationSchema,
  });
  static depTables = Object.freeze({});

  static async get<Row>(
    db: lf$Database,
    tx: lf$Transaction,
    derivationIds: Array<number>,
    level: number,
  ): Promise<$ReadOnlyArray<$ReadOnly<Row>>> {
    const tableName = TableMap.get(level);
    if (tableName == null) {
      throw new Error('GetDerivationSpecific::get Unknown table queried');
    }
    return await getRowIn<Row>(
      db, tx,
      tableName,
      GetDerivationSpecific.ownTables[KeyDerivationSchema.name].properties.KeyDerivationId,
      derivationIds,
    );
  }
}

export class GetPrivateDeriver {
  static ownTables = Object.freeze({
    [Tables.PrivateDeriverSchema.name]: Tables.PrivateDeriverSchema,
  });
  static depTables = Object.freeze({});

  static async fromBip44Wrapper(
    db: lf$Database,
    tx: lf$Transaction,
    key: number,
  ): Promise<$ReadOnly<PrivateDeriverRow> | void> {
    return await getRowFromKey<PrivateDeriverRow>(
      db, tx,
      key,
      GetPrivateDeriver.ownTables[Tables.PrivateDeriverSchema.name].name,
      GetPrivateDeriver.ownTables[Tables.PrivateDeriverSchema.name].properties.Bip44WrapperId,
    );
  }
}

export class GetKeyForPrivateDeriver {
  static ownTables = Object.freeze({});
  static depTables = Object.freeze({
    GetKeyForDerivation,
    GetPrivateDeriver,
  });

  static async get(
    db: lf$Database,
    tx: lf$Transaction,
    bip44WrapperId: number,
    getPublic: boolean,
    getPrivate: boolean,
  ): Promise<{
    PrivateDeriver: $ReadOnly<PrivateDeriverRow>,
    KeyDerivation: $ReadOnly<KeyDerivationRow>,
    publicKey: $ReadOnly<KeyRow> | null | void,
    privateKey: $ReadOnly<KeyRow> | null | void,
  }> {
    const result = await GetKeyForPrivateDeriver.depTables.GetPrivateDeriver.fromBip44Wrapper(
      db, tx,
      bip44WrapperId,
    );
    if (result === undefined) {
      throw new StaleStateError('GetKeyForPrivateDeriver::get GetPrivateDeriver');
    }

    const derivationAndKey = await GetKeyForPrivateDeriver.depTables.GetKeyForDerivation.get(
      db, tx,
      result.KeyDerivationId,
      getPublic,
      getPrivate,
    );

    return {
      ...derivationAndKey,
      PrivateDeriver: result,
    };
  }
}

export class GetAllBip44Wallets {
  static ownTables = Object.freeze({
    [Tables.Bip44WrapperSchema.name]: Tables.Bip44WrapperSchema,
    [PublicDeriverSchema.name]: PublicDeriverSchema,
  });
  static depTables = Object.freeze({});

  static async get(
    db: lf$Database,
    tx: lf$Transaction,
  ): Promise<$ReadOnlyArray<{
    Bip44Wrapper: $ReadOnly<Bip44WrapperRow>,
    PublicDeriver: $ReadOnly<PublicDeriverRow>,
  }>> {
    const publicDeriverTable = db.getSchema().table(
      GetAllBip44Wallets.ownTables[PublicDeriverSchema.name].name
    );
    const bip44WrapperTable = db.getSchema().table(
      GetAllBip44Wallets.ownTables[Tables.Bip44WrapperSchema.name].name
    );
    const query = db
      .select()
      .from(bip44WrapperTable)
      .innerJoin(
        publicDeriverTable,
        publicDeriverTable[PublicDeriverSchema.properties.Bip44WrapperId].eq(
          bip44WrapperTable[Tables.Bip44WrapperSchema.properties.Bip44WrapperId]
        )
      );

    return await tx.attach(query);
  }
}

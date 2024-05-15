export * from "./borsh";

const BN = require("bn.js");

export interface CollectionConfig {
  name: string;
  symbol: string;
  uri: string;
  auth_pda: string;
  sfbp: number;
  collection_key: string;
  creator_1: string;
  creator_1_cut: number;
  update_auth: string;
  merkle_tree: string;
}

export class ConfigClass implements CollectionConfig {
  constructor(properties: any) {
    this.name = properties.name;
    this.symbol = properties.symbol;
    this.uri = properties.uri;
    this.auth_pda = properties.auth_pda;
    this.sfbp = properties.sfbp;
    this.collection_key = properties.collection_key;
    this.creator_1 = properties.creator_1;
    this.creator_1_cut = properties.creator_1_cut;
    this.update_auth = properties.update_auth;
    this.merkle_tree = properties.merkle_tree;
  }
  name: string;
  symbol: string;
  uri: string;
  auth_pda: string;
  sfbp: number;
  collection_key: string;
  creator_1: string;
  creator_1_cut: number;
  update_auth: string;
  merkle_tree: string;
}

export const ConfigSchema = new Map<any, any>([
  [
    ConfigClass,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["symbol", "string"],
        ["uri", "string"],
        ["auth_pda", "pubkeyAsString"],
        ["sfbp", "u16"],
        ["collection_key", "pubkeyAsString"],
        ["creator_1", "pubkeyAsString"],
        ["creator_1_cut", "u8"],
        ["update_auth", "pubkeyAsString"],
        ["merkle_tree", "pubkeyAsString"],
      ],
    },
  ],
]);

export interface MintI {
  name: string;
  uri: string;
  symbol: string;
}

export class MintClass implements MintI {
  constructor(properties: any) {
    this.name = properties.name;
    this.uri = properties.uri;
    this.symbol = properties.symbol;
  }
  name: string;
  uri: string;
  symbol: string;
}

export const MintSchema = new Map<any, any>([
  [
    MintClass,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["uri", "string"],
        ["symbol", "string"],
      ],
    },
  ],
]);

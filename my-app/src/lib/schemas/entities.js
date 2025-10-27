// @ts-nocheck
import { ObjectId } from 'mongodb';

/**
 * Entity Schema Definitions
 * This is the single source of truth for all entity structures
 */

// Base fields that all entities have
const baseEntityFields = {
  _id: ObjectId,
  gameId: ObjectId,
  name: String,
  description: String,
  createdAt: Date,
  updatedAt: Date
};

// Individual entity schemas
export const EntitySchemas = {
  game: {
    _id: ObjectId,
    ownerId: String,
    name: String,
    description: String,
    createdAt: Date,
    updatedAt: Date
  },

  scene: {
    ...baseEntityFields,
    location: String,
    dangerLevel: String,
    itemIds: [ObjectId] // Items in this scene
  },

  npc: {
    ...baseEntityFields,
    role: String,
    status: String,
    sceneId: ObjectId, // Where the NPC is located
    itemIds: [ObjectId], // Items the NPC owns
    killedByPlayerId: ObjectId // Which player killed this NPC (if any)
  },

  player: {
    ...baseEntityFields,
    class: String,
    level: String,
    itemIds: [ObjectId] // Items the player owns
  },

  item: {
    ...baseEntityFields,
    itemType: String,
    benefits: String,
    // Ownership - only one of these should be set at a time
    ownerPlayerId: ObjectId, // Player who owns this item
    ownerNpcId: ObjectId,    // NPC who owns this item
    sceneId: ObjectId        // Scene where item is located (if not owned)
  },

  session: {
    _id: ObjectId,
    gameId: String,
    userId: String,
    title: String,
    isEnded: Boolean,
    notes: {
      summary: String,
      plotDevelopments: String,
      quests: String,
      loot: String,
      xp: Number,
      secrets: String,
      factions: String,
      mysteries: String,
      goals: String,
      downtime: String,
      nextPlans: String,
      custom: String
    },
    connections: {
      npcs: [String],
      items: [String], 
      scenes: [String],
      players: [String],
      quests: [String]
    },
    createdAt: Date,
    updatedAt: Date
  },

  note: {
    _id: ObjectId,
    gameId: ObjectId,
    entityType: String, // 'npc', 'player', 'item', 'scene'
    entityId: ObjectId,
    title: String,
    text: String,
    createdAt: Date
  }
};

/**
 * Get the collection name for an entity type
 */
export function getCollectionName(entityType) {
  const collections = {
    'game': 'games',
    'scene': 'scenes',
    'npc': 'npcs',
    'player': 'players',
    'item': 'items',
    'session': 'sessions',
    'note': 'notes'
  };
  return collections[entityType] || null;
}

/**
 * Get the schema for an entity type
 */
export function getEntitySchema(entityType) {
  return EntitySchemas[entityType] || null;
}

/**
 * Create a new entity with proper defaults
 */
export function createEntityData(entityType, data) {
  const schema = getEntitySchema(entityType);
  if (!schema) throw new Error(`Unknown entity type: ${entityType}`);

  const entityData = { ...data };
  
  // Add timestamps for entities that have them
  if (schema.createdAt) {
    entityData.createdAt = new Date();
  }
  if (schema.updatedAt) {
    entityData.updatedAt = new Date();
  }

  // Add default arrays for array fields
  Object.keys(schema).forEach(field => {
    if (Array.isArray(schema[field]) && !entityData[field]) {
      entityData[field] = [];
    }
  });

  return entityData;
}

/**
 * Entity relationship definitions
 */
export const EntityRelationships = {
  // When an NPC owns an item
  npc_owns_item: {
    update: [
      { collection: 'npcs', filter: '_id', action: '$addToSet', field: 'itemIds' },
      { collection: 'items', filter: '_id', action: '$set', fields: { ownerNpcId: 'npcId', ownerPlayerId: null, sceneId: null } }
    ]
  },

  // When a player owns an item
  player_owns_item: {
    update: [
      { collection: 'players', filter: '_id', action: '$addToSet', field: 'itemIds' },
      { collection: 'items', filter: '_id', action: '$set', fields: { ownerPlayerId: 'playerId', ownerNpcId: null, sceneId: null } }
    ]
  },

  // When an item is in a scene
  item_in_scene: {
    update: [
      { collection: 'scenes', filter: '_id', action: '$addToSet', field: 'itemIds' },
      { collection: 'items', filter: '_id', action: '$set', fields: { sceneId: 'sceneId', ownerPlayerId: null, ownerNpcId: null } }
    ]
  },

  // When an NPC is in a scene
  npc_in_scene: {
    update: [
      { collection: 'npcs', filter: '_id', action: '$set', fields: { sceneId: 'sceneId' } }
    ]
  }
};
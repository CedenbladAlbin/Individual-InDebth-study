// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { getCollectionName, createEntityData, EntityRelationships } from '../schemas/entities.js';

/**
 * Generic Entity Model
 * Provides CRUD operations for all entity types using the centralized schemas
 */
export class EntityModel {
  constructor(entityType) {
    this.entityType = entityType;
    this.collectionName = getCollectionName(entityType);
    if (!this.collectionName) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Create a new entity
   */
  async create(data) {
    const db = await getDb();
    const entityData = createEntityData(this.entityType, data);
    const result = await db.collection(this.collectionName).insertOne(entityData);
    return result.insertedId;
  }

  /**
   * Find entities by criteria
   */
  async find(criteria = {}) {
    const db = await getDb();
    return await db.collection(this.collectionName).find(criteria).toArray();
  }

  /**
   * Find one entity by criteria
   */
  async findOne(criteria) {
    const db = await getDb();
    return await db.collection(this.collectionName).findOne(criteria);
  }

  /**
   * Find entity by ID
   */
  async findById(id) {
    const db = await getDb();
    return await db.collection(this.collectionName).findOne({ _id: new ObjectId(id) });
  }

  /**
   * Update entity by ID
   */
  async updateById(id, updateData) {
    const db = await getDb();
    
    // Add updated timestamp
    const data = { 
      ...updateData, 
      updatedAt: new Date() 
    };

    const result = await db.collection(this.collectionName).updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return result.matchedCount > 0;
  }

  /**
   * Delete entity by ID
   */
  async deleteById(id) {
    const db = await getDb();
    const result = await db.collection(this.collectionName).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  /**
   * Find entities by game ID
   */
  async findByGameId(gameId) {
    return await this.find({ gameId: new ObjectId(gameId) });
  }

  /**
   * Execute entity relationship updates
   */
  async executeRelationship(relationshipType, params) {
    const relationship = EntityRelationships[relationshipType];
    if (!relationship) {
      throw new Error(`Unknown relationship type: ${relationshipType}`);
    }

    const db = await getDb();
    
    // Execute all updates in the relationship
    for (const update of relationship.update) {
      const { collection, filter, action, field, fields } = update;
      
      let filterCriteria = {};
      let updateOperation = {};

      // Build filter criteria
      if (filter === '_id') {
        const idField = collection === 'npcs' ? 'npcId' : 
                       collection === 'players' ? 'playerId' :
                       collection === 'items' ? 'itemId' :
                       collection === 'scenes' ? 'sceneId' : 'id';
        filterCriteria = { _id: new ObjectId(params[idField]) };
      }

      // Build update operation
      if (action === '$addToSet' && field) {
        const valueField = field === 'itemIds' ? 'itemId' : 
                          field === 'npcIds' ? 'npcId' : 
                          field === 'playerIds' ? 'playerId' : 'value';
        updateOperation = { [action]: { [field]: new ObjectId(params[valueField]) } };
      } else if (action === '$set' && fields) {
        const setFields = {};
        Object.keys(fields).forEach(key => {
          const value = fields[key];
          if (typeof value === 'string' && params[value]) {
            setFields[key] = new ObjectId(params[value]);
          } else {
            setFields[key] = value;
          }
        });
        updateOperation = { [action]: setFields };
      }

      await db.collection(collection).updateOne(filterCriteria, updateOperation);
    }

    return true;
  }
}

// Pre-configured model instances for each entity type
export const GameModel = new EntityModel('game');
export const SceneModel = new EntityModel('scene');
export const NpcModel = new EntityModel('npc');
export const PlayerModel = new EntityModel('player');
export const ItemModel = new EntityModel('item');
export const SessionModel = new EntityModel('session');
export const NoteModel = new EntityModel('note');
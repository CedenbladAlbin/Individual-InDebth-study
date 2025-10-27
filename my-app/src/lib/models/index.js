// @ts-nocheck
/**
 * Central export for all models and schemas
 * This provides a single import point for all entity-related functionality
 */

// Export the centralized schemas
export { EntitySchemas, EntityRelationships, getCollectionName, getEntitySchema, createEntityData } from '../schemas/entities.js';

// Export the generic EntityModel and pre-configured instances
export { EntityModel, GameModel, SceneModel, NpcModel, PlayerModel, ItemModel, SessionModel, NoteModel } from './EntityModel.js';

// Export all the specific model functions (for backwards compatibility)
export * from './game.js';
export * from './scene.js';
export * from './npc.js';
export * from './player.js';
export * from './item.js';
export * from './session.js';
export * from './note.js';

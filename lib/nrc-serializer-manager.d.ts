export default initializeSerializerManager;
/**
 * Main Serializer export function where default and common serializers are load
 * @date 4/26/2023 - 12:45:40 PM
 *
 * @export
 * @return {SerializerManager}
 */
declare function initializeSerializerManager(): SerializerManager;
/**
 * Serializer manager for node-rest-client
 * @date 4/26/2023 - 12:45:40 PM
 *
 * @class SerializerManager
 * @typedef {SerializerManager}
 */
declare class SerializerManager {
    /**
       * add serializer to registry
       * @date 4/26/2023 - 12:45:40 PM
       *
       * @param {*} serializer
       */
    add(serializer: any): void;
    /**
       * Remove serializer from registry
       *
       * @param {*} serializerName
       */
    remove(serializerName: any): void;
    /**
       * Find a serializer in the registry by its name
       *
       * @param {*} serializerName
       * @return {*}
       */
    find(serializerName: any): any;
    /**
       * Clean the serializers registry
       */
    clean(): void;
    /**
       * Get the serializer that match with the response passed
       * according to its match logic
       *
       * @param {*} request
       * @return {*}
       */
    get(request: any): any;
    /**
     * Return all available regular serializers
     * @author aacerox
     *
     * @return {*}
     */
    getAll(): any;
    /**
       * Description placeholder
       * @date 4/26/2023 - 12:45:40 PM
       *
       * @return {*}
       */
    getDefault(): any;
    #private;
}

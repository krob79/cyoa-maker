import fs from 'fs';
import util from 'util';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

/**
 * Logic for reading and writing feedback data
 */
class StoryService {
  /**
   * Constructor
   * @param {*} datafile Path to a JSOn file that contains the feedback data
   */
  constructor(datafile) {
    this.datafile = datafile;
  }

  /**
   * Get all feedback items
   */
  async getList() {
    const data = await this.getData();
    return data;
  }

  /**
   * Add a new feedback item
   * @param {*} name The name of the user
   * @param {*} title The title of the feedback message
   * @param {*} message The feedback message
   */
  async addEntry(name, email, title, message) {
    console.log(`---adding entry`);
    const data = (await this.getData()) || [];
    let uuid = crypto.randomUUID();
    data.unshift({ uuid, name, email, title, message });
    return writeFile(this.datafile, JSON.stringify(data));
  }

  //returns JSON object if UUID is found
  async getEntry(uuid) {
    const data = (await this.getData()) || [];
    const filtered = data.filter((entry) => entry.uuid === uuid);
    const result = filtered[0];
    console.log("---finding entry");
    return result;
  }

  //creates a new data entry in the file
  //looks for the "parentuuid" which is the UUID of the data object 1 level higher, and the "section" to where the new data will be added

  async addDataByUUID(requestBody) {
    console.log("----StoryService.js ADDDING DATA BY UUID");
    console.log(requestBody);
    const data = (await this.getData()) || [];

    const { uuid, type, value, newline, hasEvents } = requestBody || {};
    const section = "elements";


    // 2) Build newData
    // const newData = {
    //   uuid: crypto.randomUUID(),
    //   title: requestBody.value,
    //   parent: requestBody.uuid,
    //   type: requestBody.type,                     // normalized lower-case
    //   value: requestBody.value,
    //   newline: requestBody.newline ?? false,
    //   hasEvents: requestBody.hasEvents ?? false,
    //   elements: requestBody.elements ?? [],
    // }

    const newData = {};

    Object.assign(newData, requestBody);
    newData['parent'] = requestBody.uuid;
    newData['uuid'] = crypto.randomUUID(); //have to reassign the UUID property here, otherwise it keeps whatever the requestBody had.
    newData['elements'] = requestBody.elements ?? [];

    console.log('------addDataByUUID - newData:', newData);

    // 3) Special case for "choice" -> placeholder event
    //if (type === 'choice' && typeof value === 'string' && value.includes('Event')) {
    if (type === 'choice' && hasEvents) {
      const randuuid = crypto.randomUUID();
      // Extract the first 5 characters
      const shortId = randuuid.substring(0, 5);
      const newEvent = {
        parent: newData.uuid,
        title: 'Placeholder User Event',
        uuid: randuuid,
        subtype: 'user',
        type: 'event',
        value: `user_placeholderEvent-${shortId}_+_0`,
        elements: [],
      };
      newData.elements.push(newEvent);
      // Consider a clearer title; keeping your existing behavior for now:
      newData.title = newEvent.value; // TODO: revisit
    }

    // If the element itself is an event, you referenced undefined vars previously;
    // use `type` / `value` that we normalized above.
    if (type === 'event') {
      newData.title = "Event";
    }

    console.log(`---addDataByUUID() - uuid: ${uuid} - type: ${newData.type}`);
    console.log('Before insert, data root snapshot:', Array.isArray(data) ? `array(len=${data.length})` : typeof data);

    // 4) Insert & write
    const found = insertData(data, uuid, newData, section);
    if (!found) {
      // Up to you: either throw or just log and return
      throw new Error(`addDataByUUID: target uuid ${uuid} not found for section "${section}"`);
    }

    console.log('Updated Data (post-insert) - writing to disk...');
    await writeFile(this.datafile, JSON.stringify(data, null, 2)); // pretty print helps debugging
    return data; // optional: return new structure

    // ----------------------------
    // Helper: recursive insert
    // ----------------------------
    function insertData(obj, targetUuid, nodeToInsert, sectionKey) {
      if (typeof obj !== 'object' || obj === null) return false;

      // If current object matches the uuid, modify it
      if (obj.uuid === targetUuid) {
        if (Array.isArray(obj[sectionKey])) {
          obj[sectionKey].push(nodeToInsert);
        } else {
          // Initialize section if missing or wrong type
          obj[sectionKey] = [nodeToInsert];
        }
        return true; // ✅ we updated it
      }

      // Recurse down arrays/objects
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        const val = obj[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (insertData(item, targetUuid, nodeToInsert, sectionKey)) return true;
          }
        } else if (typeof val === 'object' && val !== null) {
          if (insertData(val, targetUuid, nodeToInsert, sectionKey)) return true;
        }
      }
      return false;
    }
  }


  async addNewPage({ uuid, value }) {

    const data = (await this.getData()) || [];

    let newData = {
      parent: uuid,
      title: value,
      uuid: crypto.randomUUID(),
      type: "page",
      value: value,
    }
    let section = "elements";
    console.log(`---addNewPage() - section: ${section} - uuid: ${uuid} - type: ${newData.type}`);
    console.log(newData);

    newData.elements = [];

    // Object.keys(newData).forEach(key => {
    //   console.log(`Property: ${key}, Value: ${newData[key]}`);
    // });

    const updated = insertData(data, uuid, newData);

    console.log("Updated Data:");
    console.log(data);

    console.log("-------NEW PAGE CREATED: ", newData.uuid);
    await writeFile(this.datafile, JSON.stringify(data));
    return newData.uuid;
    //return data; // return the full structure with the update included

    function insertData(obj, uuid, newData) {
      if (typeof obj !== 'object' || obj === null) return false;

      // If the current object matches the uuid, modify it
      if (obj.uuid === uuid) {
        // console.log(`----found the uuid of ${obj.uuid}, looking for section "${section}"`);
        // console.log(obj.elements);
        // Customize this based on what you want to update:
        // For example, if you're adding to an "elements" array:
        if (Array.isArray(obj[section])) {
          obj[section].push(newData); // ✅ mutation
        } else {
          console.log("---couldn't find this section");

          obj[section] = [newData]; // initialize if missing
          return false;
        }
        return true; // Found and updated
      }

      // Recursively walk through arrays or objects
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          const val = obj[key];
          if (Array.isArray(val)) {
            for (let item of val) {
              if (insertData(item, uuid, newData)) return true;
            }
          } else if (typeof val === 'object') {
            if (insertData(val, uuid, newData)) return true;
          }
        }
      }

      return false;
    }
  }

  async removeDataByUUID(uuid) {
    const data = (await this.getData()) || [];

    const removed = removeByUUID(data, uuid);

    return writeFile(this.datafile, JSON.stringify(data)); // still return the full structure

    function removeByUUID(obj, uuid) {
      if (typeof obj !== 'object' || obj === null) return false;

      for (let key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const val = obj[key];

        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            const item = val[i];

            if (item && typeof item === 'object') {
              if (item.uuid === uuid) {
                // ✅ Found the item, remove it
                val.splice(i, 1);
                return true; // exit once found
              } else {
                // Recursively go deeper
                if (removeByUUID(item, uuid)) return true;
              }
            }
          }
        } else if (typeof val === 'object') {
          if (removeByUUID(val, uuid)) return true;
        }
      }

      return false;
    }
  }

  /*
  any objects with properties (ex: story, page, element, condition, event) should have a UUID
  this function recursively crawls through the data given to it, looking for the provided UUID
  if a match appears, that object's properties will be updated, with the new data provided by the newDataObj
  is there a better way to do this? Possibly. But for now, I'm using recursion because I don't know if the structure of this data will change
  */

  async updateDataByUUID(uuid, newDataObj) {
    const data = (await this.getData()) || [];


    // console.log(`-----calling updateDataByUUID()`);
    // console.log(`----received newDataObj`);
    // console.log(newDataObj);


    const updated = updateData(data, uuid, newDataObj);

    // console.log("Updated Data:");
    // console.log(data);
    return writeFile(this.datafile, JSON.stringify(data)); //JSON Stringify should contain updated data


    function updateData(obj, uuid, newData) {
      if (typeof obj !== 'object' || obj === null) return false;

      // If the current object matches the uuid, modify it
      if (obj.uuid === uuid) {
        //console.log(`----matched the uuid of ${obj.uuid} and ${uuid}"`);
        // console.log(`---assigning:`);
        //console.log(obj);
        //If this is a choice element, and the destination is "Event", we need to check if it contains any events
        //TO DO: Figure out a better way to check for types that does not involve the service
        //if (obj.type == "choice" && newData.value.split("||")[1] == "Event") {
        if (obj.type == "choice") {
          if (newDataObj.hasEvents) {
            //console.log("---SERVICE CHECKING CHOICE AND HASEVENTS - TRUE");
            //if no events are found, we need to add a placeholder event to avoid accidentally creating broken links
            if (obj.elements.filter(el => el.type == 'event').length == 0) {

              const randuuid = crypto.randomUUID();
              const shortId = randuuid.substring(0, 5);
              obj.elements.push(
                {
                  "parent": obj.uuid,
                  "title": "Placeholder User Event",
                  "uuid": randuuid,
                  "type": "event",
                  "value": `user_placeholderEvent-${shortId}_+_0`,
                  "elements": []
                }
              );
            }
          } else {
            console.log("---SERVICE CHECKING CHOICE AND HASEVENTS - FALSE");
          }
        }

        if (obj.type == "condition") {
          if (!obj.booloperator) {
            obj.booloperator = "AND";
          }
        }

        let updated = Object.assign(obj, newDataObj);
        //console.log(`----to:`);
        //console.log(updated);

        return true; // Found and updated
      }

      // Recursively walk through arrays or objects
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          const val = obj[key];
          if (Array.isArray(val)) {
            for (let item of val) {
              if (updateData(item, uuid, newData)) return true;
            }
          } else if (typeof val === 'object') {
            if (updateData(val, uuid, newData)) return true;
          }
        }
      }

      return false;
    }
  }

  async getDataByUUID({ uuid }) {
    //console.log(`---getDataByUUID() - searching for ${uuid}`);

    const obj = (await this.getData()) || [];
    //console.log("---initial obj: ");
    //console.log(obj);

    return checkProperties(obj, uuid);

    function checkProperties(obj, uuid) {
      //console.log(`----going deeper - ${obj.uuid ? obj.uuid : 'No UUID found'}`)
      if (obj && obj['uuid'] === uuid) {
        // console.log(`data found for ${uuid}`);
        //console.log("Obj from UUID:", obj);
        return obj; // Successfully found the obj with the corresponding UUID and returning it
      }

      // Iterate over the object's values to find the nested objects or arrays.
      if (typeof obj === 'object' && obj !== null) {
        //go through all the object keys
        for (let key in obj) {
          //console.log(`--key: ${key}`);
          if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            let result = null;

            if (Array.isArray(val)) {
              for (let item of val) {
                result = checkProperties(item, uuid);
                if (result) return result;
              }
            } else if (typeof val === 'object') {
              result = checkProperties(val, uuid);
              if (result) return result;
            }
          }
        }
      }
      return null; // The UUID was not found or the property could not be updated
    }
  }

  async getConditionsEventsList() {
    // console.log(`---getConditionsEventsList() - gathering all events and conditions`);

    const obj = (await this.getData()) || [];
    // console.log("---initial obj: ");
    console.log(obj);

    let conditions = [];
    let events = [];
    let current = []; //temp array
    let currentPageID;
    let currentPageTitle;


    let results = checkProperties(obj);

    let fullList = { "conditions": conditions, "events": events };

    console.log(`---Full list of Conditions and Events:`);
    // console.log(fullList);

    return fullList;

    function checkProperties(obj) {
      if (obj && obj.type == 'condition') {
        const m = obj.value.match(/^(.+?)(<=|>=|==|=|!=|<|>)(.+)$/);
        if (!m) throw new Error(`Invalid condition: ${obj.value}`);

        const rawName = m[1].trim();
        const op = m[2].trim();
        let rawValue = m[3].trim();

        conditions.push({ "name": rawName, "obj": obj, "pageUUID": currentPageID, "pageTitle": currentPageTitle });
      } else if (obj && obj.type == 'event') {
        let split = obj.value.split('_');
        let eType = split[0];
        let eProperty = split[1];
        let eOperator = split[2];
        let eAmount = split[3];
        events.push({ "name": eProperty, "obj": obj, "pageUUID": currentPageID, "pageTitle": currentPageTitle });
      } else if (obj && obj.type == "page") {
        currentPageID = obj.uuid;
        currentPageTitle = obj.title;
      }

      // Iterate over the object's values to find the nested objects or arrays.
      if (typeof obj === 'object' && obj !== null) {
        //go through all the object keys
        for (let key in obj) {
          // console.log(`--key: ${key}`);
          if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            // console.log(`--key: ${key} - value: ${obj[key]}`);
            let result = null;

            if (Array.isArray(val)) {
              for (let item of val) {
                result = checkProperties(item);
                if (result) return result;
              }
            } else if (typeof val === 'object') {
              result = checkProperties(val);
              if (result) return result;
            }
          }
        }
      }
      // console.log("conditions: ", conditions); // The UUID was not found or the property could not be updated
    }
    // console.log("---done: ", conditions);
  }

  //
  async updateEntry(uuid, newData) {
    const prevData = (await this.getData()) || [];
    const updatedData = prevData.map((entry) => {
      if (entry.uuid === uuid) {
        console.log("-----found a match!");
        //console.log(entry);
        let updated = Object.assign({}, entry, newData);
        //console.log(updatedData);
        return updated;
      } else {
        return entry;
      }
    });
    return writeFile(this.datafile, JSON.stringify(updatedData));
  }

  //finds and removes entry from JSON file based on UUID.
  //Needs a complementry function that removes any images that went with it
  async removeEntry(uuid) {
    console.log(`---removing entry`);
    const data = (await this.getData()) || [];
    const filtered = data.filter((entry) => entry.uuid !== uuid);
    console.log(JSON.stringify(filtered));
    //return JSON.stringify(filtered);
    return writeFile(this.datafile, JSON.stringify(filtered));
  }

  /**
   * Fetches feedback data from the JSON file provided to the constructor
   */
  async getData() {
    const data = await readFile(this.datafile, 'utf8');
    if (!data) return [];
    return JSON.parse(data);
  }
}

export default StoryService;

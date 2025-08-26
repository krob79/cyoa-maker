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

  async addDataByUUID({ title = "Unnamed", uuid, section, type, value, html = "" }) {

    const data = (await this.getData()) || [];

    let newData = {
      title: value,
      uuid: crypto.randomUUID(),
      type: type,
      value: value,
      html: html
    }
    console.log(`---addDataByUUID() - section: ${section} - uuid: ${uuid} - type: ${newData.type}`);
    console.log(newData);

    newData.elements = [];

    const updated = insertData(data, uuid, newData);

    console.log("Updated Data:");
    console.log(data);
    return writeFile(this.datafile, JSON.stringify(data));
    //return data; // return the full structure with the update included

    function insertData(obj, uuid, newData) {
      if (typeof obj !== 'object' || obj === null) return false;

      // If the current object matches the uuid, modify it
      if (obj.uuid === uuid) {
        // console.log(`----found the uuid of ${obj.uuid}, looking for section "${section}"`);
        console.log(obj.elements);
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

  async addNewPage({ uuid, value }) {

    const data = (await this.getData()) || [];

    let newData = {
      title: value,
      uuid: crypto.randomUUID(),
      type: "page",
      value: value,
      html: ""
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
    return writeFile(this.datafile, JSON.stringify(data));
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

    console.log(`-----calling updateDataByUUID()`);
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
        // console.log(`----matched the uuid of ${obj.uuid} and ${uuid}"`);
        // console.log(`---assigning:`);
        // console.log(obj);
        // console.log(`----to:`);
        // console.log(newDataObj);
        let updated = Object.assign(obj, newDataObj);

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
    console.log(`---getDataByUUID() - searching for ${uuid}`);

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

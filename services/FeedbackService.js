const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

/**
 * Logic for reading and writing feedback data
 */
class FeedbackService {
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

export default FeedbackService;

// This file represents a base structure for events.
// A class-based event handler would extend this class for each event.

class Event {
  /**
   * @param {Client} client The discord client
   * @param {string} name The name of the event
   * @param {boolean} [once=false] Whether the event should run once
   */
  constructor(client, name, once = false) {
    this.client = client;
    this.name = name;
    this.once = once;
  }

  // This is a placeholder for the event's execution logic
  // You would override this method in each event file.
  async execute(...args) {
    throw new Error(`The execute method has not been implemented in ${this.name}`);
  }
}

module.exports = Event;

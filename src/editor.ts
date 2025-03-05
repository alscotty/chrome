class Editor {
  // ...existing code...

  private async createAlarm(name: string, delayInMinutes: number) {
    await chrome.alarms.create(name, { delayInMinutes });
  }

  private async someFunction() {
    // ...existing code...
    await this.createAlarm('some-alarm', 0.5);
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'some-alarm') {
        // Handle the alarm
      }
    });
  }

  // ...existing code...
}

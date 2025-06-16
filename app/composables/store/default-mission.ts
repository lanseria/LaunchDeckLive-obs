// app/composables/store/default-mission.ts
export const defaultFalcon9Mission: MissionSequenceFile = {
  missionName: 'Starlink Mission',
  vehicle: 'Falcon 9',
  videoConfig: {
    type: 'local',
    source: '/videos/falcon9_starlink_launch.mp4',
    startTimeOffset: -13,
  },
  events: [
    {
      time: -300,
      name: 'ENGINE CHILL',
    },
    {
      time: -65,
      name: 'STRONGBACK RETRACT',
    },
    {
      time: -10,
      name: 'STARTUP',
    },
    {
      time: 0,
      name: 'LIFTOFF',
      telemetry: {
        speed_kmh: 0,
        altitude_km: 0,
      },
      displayInfo: {
        title: 'LIFTOFF',
        line1: 'FALCON 9 HAS CLEARED THE TOWER',
        line2: '',
        line3: '',
      },
    },
    {
      time: 72,
      name: 'MAX-Q',
      telemetry: {
        speed_kmh: 1900,
        altitude_km: 11.5,
      },
      displayInfo: {
        title: 'MAX-Q',
        line1: 'MAXIMUM DYNAMIC PRESSURE',
        line2: 'THIS IS THE LARGEST AMOUNT OF STRESS',
        line3: 'EXERTED ON THE VEHICLE',
      },
    },
    {
      time: 145,
      name: 'MECO',
      telemetry: {
        speed_kmh: 8050,
        altitude_km: 66.8,
      },
      displayInfo: {
        title: 'MECO',
        line1: 'MAIN ENGINE CUTOFF',
        line2: 'FIRST STAGE BURN COMPLETE',
        line3: '',
      },
    },
    {
      time: 195,
      name: 'FAIRING',
      telemetry: {
        speed_kmh: 10200,
        altitude_km: 110.1,
      },
      displayInfo: {
        title: 'FAIRING SEP',
        line1: 'PAYLOAD FAIRING SEPARATED',
        line2: 'SATELLITES EXPOSED TO SPACE',
        line3: '',
      },
    },
    {
      time: 380,
      name: 'ENTRY BURN',
      telemetry: {
        speed_kmh: 6500,
        altitude_km: 70.0,
      },
      displayInfo: {
        title: 'ENTRY BURN',
        line1: 'FIRST STAGE RE-ENTERING ATMOSPHERE',
        line2: 'SLOWING DOWN FOR LANDING',
        line3: '',
      },
    },
    {
      time: 490,
      name: 'SECO-1',
      telemetry: {
        speed_kmh: 27500,
        altitude_km: 185.0,
      },
      displayInfo: {
        title: 'SECO-1',
        line1: 'SECOND ENGINE CUTOFF',
        line2: 'PARKING ORBIT ACHIEVED',
        line3: '',
      },
    },
    {
      time: 530,
      name: 'LANDING',
      telemetry: {
        speed_kmh: 0,
        altitude_km: 0,
      },
      displayInfo: {
        title: 'LANDING',
        line1: 'FIRST STAGE HAS LANDED',
        line2: 'ON DRONESHIP',
        line3: 'A SHORTFALL OF GRAVITAS',
      },
    },
  ],
}

export function generateAikarFlags(
  memoryMb: number,
  jarPath: string,
  extraJvmArgs: string[] = []
): string[] {
  const flags: string[] = [
    `-Xms${memoryMb}M`,
    `-Xmx${memoryMb}M`,
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
    '-Dusing.aikars.flags=https://mcflags.emc.gs',
    '-Daikars.new.flags=true',
    ...extraJvmArgs,
    '-jar',
    jarPath,
    'nogui'
  ];

  return flags;
}

export function generateBasicFlags(
  memoryMb: number,
  jarPath: string,
  extraJvmArgs: string[] = []
): string[] {
  return [
    `-Xms${memoryMb}M`,
    `-Xmx${memoryMb}M`,
    ...extraJvmArgs,
    '-jar',
    jarPath,
    'nogui'
  ];
}

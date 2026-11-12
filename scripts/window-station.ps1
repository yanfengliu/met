# Runs one command in a separate, non-interactive window station, where nothing it starts can confine or move the owner's cursor, and waits for it (work unit 20).
# Why: on Windows, Chrome's pointer lock confines the system cursor to the page (ClipCursor) and moves it (SetCursorPos), headless or not, and Windows refuses both to a program in a non-interactive window station.
# A hidden desktop in the interactive window station is not enough: it stops the moves but not the confinement (measured 2026-11-04, docs/work/20_e2e-cursor/plan.md).
# Only administrators may name a window station, so this asks for an unnamed one, which Windows names after the logon session; the desktop in it is named met-e2e.
# The command gets this script's standard input, output and error, working directory and environment, and its exit status is this script's. A failure here exits 1 and says why on standard error; this script writes nothing to standard output.
# The command and everything it starts run in a job that Windows ends when this script ends, however it ends. Windows deletes the window station and the desktop with their last handle and process.
# MET_WINDOW_STATION_TEMP, when set, names the command's temporary folder, which this script removes once the command has ended and it has ended everything else in the
# job, so a run whose runner dies leaves nothing there either: this script outlives the runner (work unit 20, review 1, F3).
# Usage: scripts/window-station.ts sets MET_WINDOW_STATION_COMMAND to the quoted command line, so PowerShell's own parsing never sees it, and starts this script with -File.
$ErrorActionPreference = 'Stop'
$commandLine = $env:MET_WINDOW_STATION_COMMAND
if (-not $commandLine) {
  [Console]::Error.WriteLine('window-station.ps1: MET_WINDOW_STATION_COMMAND is empty. scripts/window-station.ts sets it to the command line to run in the window station.')
  exit 1
}
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class MetWindowStation {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct STARTUPINFO {
    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
    public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
    public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }
  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit;
    public UIntPtr Affinity; public uint PriorityClass, SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct IO_COUNTERS { public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
  }

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateWindowStationW(string name, uint flags, uint access, IntPtr sa);
  [DllImport("user32.dll", SetLastError = true)] static extern IntPtr GetProcessWindowStation();
  [DllImport("user32.dll", SetLastError = true)] static extern bool SetProcessWindowStation(IntPtr station);
  [DllImport("user32.dll", SetLastError = true)] static extern bool CloseWindowStation(IntPtr station);
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool GetUserObjectInformationW(IntPtr obj, int index, StringBuilder info, int length, out int needed);
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateDesktopW(string name, IntPtr device, IntPtr devmode, uint flags, uint access, IntPtr sa);
  [DllImport("user32.dll", SetLastError = true)] static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObjectW(IntPtr sa, string name);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, int length);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GetStdHandle(int which);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CreateProcessW(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateJobObject(IntPtr job, uint code);
  [DllImport("kernel32.dll", SetLastError = true)] static extern uint WaitForSingleObject(IntPtr h, uint ms);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);

  const uint WINSTA_ALL_ACCESS = 0x37F;
  const uint GENERIC_ALL = 0x10000000;
  const int UOI_NAME = 2;
  const int JOB_OBJECT_EXTENDED_LIMIT_INFORMATION = 9;
  const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
  const uint CREATE_SUSPENDED = 0x4;
  const uint CREATE_NO_WINDOW = 0x08000000;
  const int STARTF_USESTDHANDLES = 0x100;
  const uint INFINITE = 0xFFFFFFFF;
  const string DESKTOP = "met-e2e";

  // Never closed here: Windows closes it when this process ends, and with it ends every process in the job.
  static IntPtr job;

  // Ends every process still in the job, as Windows does when this process ends.
  public static void EndJob() {
    if (job != IntPtr.Zero) TerminateJobObject(job, 1);
  }

  static Win32Exception Failed(string what) {
    int err = Marshal.GetLastWin32Error();
    return new Win32Exception(err, what + " failed with Windows error " + err + ": " + new Win32Exception(err).Message);
  }

  public static int Run(string commandLine, string workDir) {
    job = CreateJobObjectW(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw Failed("CreateJobObject");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if (!SetInformationJobObject(job, JOB_OBJECT_EXTENDED_LIMIT_INFORMATION, ref limits, Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)))) throw Failed("SetInformationJobObject");

    IntPtr station = CreateWindowStationW(null, 0, WINSTA_ALL_ACCESS, IntPtr.Zero);
    if (station == IntPtr.Zero) throw Failed("CreateWindowStation");
    StringBuilder name = new StringBuilder(256);
    int needed;
    if (!GetUserObjectInformationW(station, UOI_NAME, name, name.Capacity * 2, out needed)) throw Failed("GetUserObjectInformation");
    IntPtr own = GetProcessWindowStation();
    if (!SetProcessWindowStation(station)) throw Failed("SetProcessWindowStation");
    IntPtr desktop = CreateDesktopW(DESKTOP, IntPtr.Zero, IntPtr.Zero, 0, GENERIC_ALL, IntPtr.Zero);
    Win32Exception desktopFailed = desktop == IntPtr.Zero ? Failed("CreateDesktop") : null;
    SetProcessWindowStation(own);
    if (desktopFailed != null) throw desktopFailed;

    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
    si.lpDesktop = name.ToString() + "\\" + DESKTOP;
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = GetStdHandle(-10);
    si.hStdOutput = GetStdHandle(-11);
    si.hStdError = GetStdHandle(-12);
    PROCESS_INFORMATION pi;
    if (!CreateProcessW(null, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, true, CREATE_SUSPENDED | CREATE_NO_WINDOW, IntPtr.Zero, workDir, ref si, out pi)) throw Failed("CreateProcess in " + si.lpDesktop);
    if (!AssignProcessToJobObject(job, pi.hProcess)) {
      Win32Exception assignFailed = Failed("AssignProcessToJobObject");
      TerminateProcess(pi.hProcess, 1);
      throw assignFailed;
    }
    ResumeThread(pi.hThread);
    CloseHandle(pi.hThread);
    // The desktop and window station stay open until the command ends: a process connects to them only when it first draws or reads input.
    WaitForSingleObject(pi.hProcess, INFINITE);
    uint code;
    GetExitCodeProcess(pi.hProcess, out code);
    CloseHandle(pi.hProcess);
    CloseDesktop(desktop);
    CloseWindowStation(station);
    return (int)code;
  }
}
'@
$code = 1
try {
  $code = [MetWindowStation]::Run($commandLine, [Environment]::CurrentDirectory)
} catch {
  $reason = $_.Exception
  while ($reason.InnerException) { $reason = $reason.InnerException }
  [Console]::Error.WriteLine('window-station.ps1: could not run the command in a separate window station. ' + $reason.Message)
}
$temp = $env:MET_WINDOW_STATION_TEMP
if ($temp) {
  [MetWindowStation]::EndJob()
  # The job's processes take a moment to end and free their files: up to 60 s of tries, a bound on a hang (10 s ran out once on a machine at 100% CPU, work unit 30).
  for ($try = 0; $try -lt 240 -and (Test-Path -LiteralPath $temp); $try++) {
    try { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 250 }
  }
  if (Test-Path -LiteralPath $temp) { [Console]::Error.WriteLine("window-station.ps1: could not remove the command's temporary folder $temp.") }
}
exit $code

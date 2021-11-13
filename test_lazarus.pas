program test;

{$mode objfpc}{$H+}
{$macro on}

uses
  Classes, SysUtils, LazVersion;

begin
  WriteLn('CPU: ', {$I %FPCTARGETCPU%});
  WriteLn('OS: ', {$I %FPCTARGETOS%});

  WriteLn(Format('FPC version %d.%d.%d', [FPC_VERSION, FPC_RELEASE, FPC_PATCH]));
  WriteLn(Format('Lazarus version %s', [LAZ_VERSION]));
end.


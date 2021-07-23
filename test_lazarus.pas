program test;

{$mode objfpc}{$H+}
{$macro on}

uses
  Classes, SysUtils, LazVersion;

begin
  WriteLn(Format('Compiled with FPC version %d.%d.%d', [FPC_VERSION, FPC_RELEASE, FPC_PATCH]));
  WriteLn(Format('Compiled with Lazarus version %s', [LAZ_VERSION]));
end.


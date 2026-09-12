{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
    pkgs.git
    pkgs.openssl
    pkgs.postgresql_16   # ← ajouté
  ];
  env = {};
  idx = {
    extensions = [];
    previews = {
      enable = true;
      previews = {};
    };
    workspace = {
      onCreate = {};
      onStart = {};
    };
  };
}

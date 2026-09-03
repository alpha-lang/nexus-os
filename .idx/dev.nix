{ pkgs, ... }: {
  # Packages système
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
    pkgs.git
    pkgs.openssl
    pkgs.postgresql_16   # si vous utilisez PostgreSQL
  ];

  # Scripts exécutés au démarrage
  shellHook = ''
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    echo "🚀 Nexus OS - Environnement prêt !"
  '';
}

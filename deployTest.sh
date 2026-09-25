ssh "$DEPLOY_USER@$DEPLOY_HOST" 
	     \"set -euo pipefail && \
             cd $DEPLOY_PATH && \
             export PATH=\$HOME/.local/share/mise/shims:/home/grange/.local/bin/mise:\$PATH && \
             export CI=false && \
             pnpm install --frozen-lockfile --prod && \
             export XDG_RUNTIME_DIR=/run/user/\$(id -u) && \
             systemctl --user restart grange && \
             sleep 2 && \
             curl -fsS http://localhost:$APP_PORT/api/state"

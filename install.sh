#!/bin/sh
# install.sh — ручная установка VlessManager

set -e

echo "=== VlessManager Installer ==="

# Зависимости
echo "Installing dependencies..."
apk add sing-box curl jq coreutils-base64 2>/dev/null || {
    echo "Warning: some packages may need manual installation"
}

# Создаём директории
mkdir -p /etc/config
mkdir -p /etc/init.d
mkdir -p /usr/bin
mkdir -p /usr/share/luci/menu.d
mkdir -p /usr/share/rpcd/acl.d
mkdir -p /www/luci-static/resources/view/vlessmanager
mkdir -p /var/run/vlessmanager

# Копируем файлы (предполагается, что скрипт запускается из директории проекта)
echo "Installing configuration..."
cp root/etc/config/vlessmanager /etc/config/vlessmanager

echo "Installing main script..."
cp root/usr/bin/vlessmanager /usr/bin/vlessmanager
chmod +x /usr/bin/vlessmanager

echo "Installing init script..."
cp root/etc/init.d/vlessmanager /etc/init.d/vlessmanager
chmod +x /etc/init.d/vlessmanager

echo "Installing LuCI menu..."
cp root/usr/share/luci/menu.d/luci-app-vlessmanager.json /usr/share/luci/menu.d/

echo "Installing ACL..."
cp root/usr/share/rpcd/acl.d/luci-app-vlessmanager.json /usr/share/rpcd/acl.d/

echo "Installing LuCI view..."
cp htdocs/luci-static/resources/view/vlessmanager/settings.js \
    /www/luci-static/resources/view/vlessmanager/settings.js

# UCI defaults
echo "Running UCI defaults..."
sh root/etc/uci-defaults/99-vlessmanager

# Включаем сервис
/etc/init.d/vlessmanager enable 2>/dev/null || true

# Перезапускаем rpcd и uhttpd
echo "Restarting services..."
/etc/init.d/rpcd restart 2>/dev/null || true
/etc/init.d/uhttpd restart 2>/dev/null || true

echo ""
echo "=== Installation complete ==="
echo "Open LuCI: VPN -> VlessManager"
echo "Or use CLI: vlessmanager {start|stop|restart|update|status}"

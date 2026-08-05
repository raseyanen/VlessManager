#!/bin/sh
# uninstall.sh

echo "=== VlessManager Uninstaller ==="

# Останавливаем
/usr/bin/vlessmanager stop 2>/dev/null
/etc/init.d/vlessmanager disable 2>/dev/null

# Удаляем cron
crontab -l 2>/dev/null | grep -v vlessmanager | crontab - 2>/dev/null

# Удаляем файлы
rm -f /usr/bin/vlessmanager
rm -f /etc/init.d/vlessmanager
rm -f /usr/share/luci/menu.d/luci-app-vlessmanager.json
rm -f /usr/share/rpcd/acl.d/luci-app-vlessmanager.json
rm -rf /www/luci-static/resources/view/vlessmanager
rm -rf /var/run/vlessmanager
rm -f /var/log/vlessmanager.log
rm -f /var/lock/vlessmanager.lock

# Оставляем конфиг? Спрашиваем
echo "Remove configuration? (y/N)"
read -r answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    rm -f /etc/config/vlessmanager
    echo "Configuration removed"
fi

# Перезапуск сервисов
/etc/init.d/rpcd restart 2>/dev/null
/etc/init.d/uhttpd restart 2>/dev/null

echo "=== Uninstallation complete ==="

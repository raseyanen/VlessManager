include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-vlessmanager
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-vlessmanager
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=VlessManager - VLESS Proxy Manager
  PKGARCH:=all
endef

define Package/luci-app-vlessmanager/description
  VLESS proxy manager with LuCI UI, subscription updates,
  urltest failover and TUN interface.
  Runtime requirements: curl, sing-box, LuCI.
endef

define Package/luci-app-vlessmanager/conffiles
/etc/config/vlessmanager
endef

define Package/luci-app-vlessmanager/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/vlessmanager $(1)/etc/config/vlessmanager

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/vlessmanager $(1)/etc/init.d/vlessmanager

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/99-vlessmanager $(1)/etc/uci-defaults/99-vlessmanager

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./root/usr/bin/vlessmanager $(1)/usr/bin/vlessmanager
	$(INSTALL_BIN) ./root/usr/bin/vlessmanager-urltest $(1)/usr/bin/vlessmanager-urltest

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-vlessmanager.json $(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-vlessmanager.json $(1)/usr/share/rpcd/acl.d/

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/vlessmanager
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/vlessmanager/settings.js \
		$(1)/www/luci-static/resources/view/vlessmanager/settings.js
endef

define Package/luci-app-vlessmanager/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	echo "VlessManager installed."

	if ! command -v curl >/dev/null 2>&1; then
		echo "WARNING: curl not found. Install it manually: apk add curl"
	fi

	if ! command -v sing-box >/dev/null 2>&1; then
		echo "WARNING: sing-box not found. Install it manually: apk add sing-box"
	fi

	if [ ! -d /www/luci-static/resources ] && [ ! -d /www/luci-static ]; then
		echo "WARNING: LuCI not found. Install LuCI first."
	fi

	exit 0
}
endef

$(eval $(call BuildPackage,luci-app-vlessmanager))

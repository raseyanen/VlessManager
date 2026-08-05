include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-vlessmanager
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=raseyanen

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
  urltest failover and TUN interface for podkop.
  Runtime requirements: curl, sing-box, luci-base.
endef

define Package/luci-app-vlessmanager/conffiles
/etc/config/vlessmanager
endef

# ============================================
# ВАЖНО: пакет без исходников — отключаем сборку
# ============================================
define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Configure
endef

define Build/Compile
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
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-vlessmanager.json \
		$(1)/usr/share/luci/menu.d/luci-app-vlessmanager.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-vlessmanager.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-vlessmanager.json

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/vlessmanager
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/vlessmanager/settings.js \
		$(1)/www/luci-static/resources/view/vlessmanager/settings.js
endef

define Package/luci-app-vlessmanager/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	echo "VlessManager installed."

	MISSING=""
	command -v curl     >/dev/null 2>&1 || MISSING="$$MISSING curl"
	command -v sing-box >/dev/null 2>&1 || MISSING="$$MISSING sing-box"

	if [ -n "$$MISSING" ]; then
		echo "WARNING: missing runtime dependencies:$$MISSING"
		echo "Install them with: apk add$$MISSING"
		echo "            or:    opkg install$$MISSING"
	fi

	[ -x /etc/uci-defaults/99-vlessmanager ] && {
		(. /etc/uci-defaults/99-vlessmanager) && rm -f /etc/uci-defaults/99-vlessmanager
	}

	/etc/init.d/rpcd restart 2>/dev/null
	exit 0
}
endef

define Package/luci-app-vlessmanager/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/usr/bin/vlessmanager stop 2>/dev/null
	/etc/init.d/vlessmanager disable 2>/dev/null
	crontab -l 2>/dev/null | grep -v vlessmanager | crontab - 2>/dev/null
	exit 0
}
endef

$(eval $(call BuildPackage,luci-app-vlessmanager))

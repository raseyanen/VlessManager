// htdocs/luci-static/resources/view/vlessmanager/settings.js

'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require rpc';
'require poll';
'require fs';

var callGetStatus = rpc.declare({
    object: 'file',
    method: 'exec',
    params: ['command', 'params'],
    expect: { stdout: '' }
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('vlessmanager'),
            this.getStatus(),
            this.getServers(),
            this.getLog()
        ]);
    },

    getStatus: function () {
        return fs.exec('/usr/bin/vlessmanager', ['status'])
            .then(function (res) {
                try {
                    return JSON.parse(res.stdout.trim());
                } catch (e) {
                    return { status: 'unknown', message: 'Cannot parse status' };
                }
            })
            .catch(function () {
                return { status: 'unknown', message: 'Cannot get status' };
            });
    },

    getServers: function () {
        return fs.exec('/usr/bin/vlessmanager', ['servers'])
            .then(function (res) {
                try {
                    return JSON.parse(res.stdout.trim());
                } catch (e) {
                    return { servers: [], count: 0 };
                }
            })
            .catch(function () {
                return { servers: [], count: 0 };
            });
    },

    getLog: function () {
        return fs.exec('/usr/bin/vlessmanager', ['log', '100'])
            .then(function (res) {
                try {
                    var data = JSON.parse(res.stdout.trim());
                    return data.log || '';
                } catch (e) {
                    return '';
                }
            })
            .catch(function () {
                return '';
            });
    },

    handleAction: function (action) {
        var self = this;

        ui.showModal(_('VlessManager'), [
            E('p', { class: 'spinning' }, _('Executing: %s...').format(action))
        ]);

        return fs.exec('/usr/bin/vlessmanager', [action])
            .then(function () {
                return new Promise(function (resolve) {
                    setTimeout(resolve, 3000);
                });
            })
            .then(function () {
                ui.hideModal();
                window.location.reload();
            })
            .catch(function (err) {
                ui.hideModal();
                ui.addNotification(null, E('p', _('Error executing %s: %s').format(action, err.message)), 'error');
            });
    },

    render: function (data) {
        var status = data[1] || {};
        var servers = data[2] || {};
        var logContent = data[3] || '';
        var self = this;

        var m, s, o;

        m = new form.Map('vlessmanager', _('VlessManager'),
            _('VLESS proxy manager with automatic subscription updates and URL testing. Creates a TUN VPN interface compatible with podkop.'));

        // ==================== STATUS SECTION ====================

        s = m.section(form.NamedSection, 'main', 'vlessmanager', _('Status & Control'));
        s.anonymous = true;

        // Status display
        o = s.option(form.DummyValue, '_status', _('Service Status'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            var statusClass = 'label';
            var statusText = status.status || 'unknown';
            var statusMsg = status.message || '';

            switch (status.status) {
                case 'running':
                    statusClass = 'label success';
                    break;
                case 'stopped':
                    statusClass = 'label warning';
                    break;
                case 'error':
                    statusClass = 'label danger';
                    break;
                default:
                    statusClass = 'label notice';
            }

            var html = '<div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">';
            html += '<span class="' + statusClass + '" style="padding:5px 12px;border-radius:4px;font-weight:bold;">' + statusText.toUpperCase() + '</span>';
            if (statusMsg) {
                html += '<span style="color:#666;">' + statusMsg + '</span>';
            }
            if (status.server_count > 0) {
                html += '<span class="label" style="padding:3px 8px;">Servers: ' + status.server_count + '</span>';
            }
            if (status.last_update) {
                html += '<span style="color:#888;font-size:0.9em;">Last update: ' + status.last_update + '</span>';
            }
            if (status.version) {
                html += '<span style="color:#888;font-size:0.85em;">v' + status.version + '</span>';
            }
            html += '</div>';
            return html;
        };

        // Control buttons
        o = s.option(form.DummyValue, '_controls', _('Controls'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            return '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                '<button class="cbi-button cbi-button-apply" onclick="document.dispatchEvent(new CustomEvent(\'vlessmanager-action\', {detail:\'start\'}))">' + _('Start') + '</button>' +
                '<button class="cbi-button cbi-button-reset" onclick="document.dispatchEvent(new CustomEvent(\'vlessmanager-action\', {detail:\'stop\'}))">' + _('Stop') + '</button>' +
                '<button class="cbi-button cbi-button-action" onclick="document.dispatchEvent(new CustomEvent(\'vlessmanager-action\', {detail:\'restart\'}))">' + _('Restart') + '</button>' +
                '<button class="cbi-button cbi-button-action" onclick="document.dispatchEvent(new CustomEvent(\'vlessmanager-action\', {detail:\'update\'}))">' + _('Force Update') + '</button>' +
                '</div>';
        };

        // Event listener for buttons
        document.addEventListener('vlessmanager-action', function (e) {
            self.handleAction(e.detail);
        });

        // ==================== MAIN SETTINGS ====================

        s = m.section(form.NamedSection, 'main', 'vlessmanager', _('General Settings'));
        s.anonymous = true;
        s.tab('general', _('General'));
        s.tab('filter', _('Filters'));
        s.tab('urltest', _('URL Test'));
        s.tab('network', _('Network & TUN'));
        s.tab('advanced', _('Advanced'));
        s.tab('servers', _('Servers'));
        s.tab('log', _('Log'));

        // --- General Tab ---

        o = s.taboption('general', form.Flag, 'enabled', _('Enable'),
            _('Enable or disable VlessManager service'));
        o.rmempty = false;
        o.default = '0';

        o = s.taboption('general', form.Value, 'subscribe_url', _('Subscription URL'),
            _('URL to a raw text file with VLESS configs (one per line). Can be a GitHub raw URL.'));
        o.rmempty = false;
        o.placeholder = 'https://raw.githubusercontent.com/user/repo/main/configs.txt';
        o.validate = function (section_id, value) {
            if (!value || value === '') return _('Subscription URL is required');
            if (!/^https?:\/\//.test(value)) return _('URL must start with http:// or https://');
            return true;
        };

        o = s.taboption('general', form.Value, 'update_interval', _('Update Interval (minutes)'),
            _('How often to refresh the subscription. Minimum: 5 minutes.'));
        o.datatype = 'min(5)';
        o.default = '60';
        o.placeholder = '60';

        o = s.taboption('general', form.ListValue, 'log_level', _('Log Level'));
        o.value('trace', 'Trace');
        o.value('debug', 'Debug');
        o.value('info', 'Info');
        o.value('warn', 'Warning');
        o.value('error', 'Error');
        o.value('fatal', 'Fatal');
        o.default = 'warn';

        // --- Filter Tab ---

        o = s.taboption('filter', form.Value, 'include_regex', _('Include Regex'),
            _('Only include configs whose name matches this regex. Leave empty to include all. Applied to the config name (part after #).'));
        o.placeholder = '(US|DE|NL)';
        o.rmempty = true;

        o = s.taboption('filter', form.Value, 'exclude_regex', _('Exclude Regex'),
            _('Exclude configs whose name matches this regex. Leave empty to exclude nothing.'));
        o.placeholder = '(expired|test)';
        o.rmempty = true;

        o = s.taboption('filter', form.MultiValue, 'transport_filter', _('Transport Filter'),
            _('Filter by transport type. Select "all" to allow all types.'));
        o.value('all', _('All'));
        o.value('tcp', 'TCP');
        o.value('ws', 'WebSocket');
        o.value('xhttp', 'XHTTP/SplitHTTP');
        o.value('grpc', 'gRPC');
        o.value('http', 'HTTP/H2');
        o.default = 'all';

        // --- URL Test Tab ---

        o = s.taboption('urltest', form.Value, 'urltest_url', _('URL Test URL'),
            _('URL used for testing server availability. Should return a quick response.'));
        o.default = 'https://www.gstatic.com/generate_204';
        o.placeholder = 'https://www.gstatic.com/generate_204';

        o = s.taboption('urltest', form.Value, 'urltest_interval', _('Test Interval (seconds)'),
            _('How often sing-box performs URL tests between servers.'));
        o.datatype = 'min(30)';
        o.default = '300';
        o.placeholder = '300';

        o = s.taboption('urltest', form.Value, 'urltest_tolerance', _('Tolerance (ms)'),
            _('Maximum allowed latency difference in milliseconds between servers.'));
        o.datatype = 'min(0)';
        o.default = '50';
        o.placeholder = '50';

        o = s.taboption('urltest', form.Value, 'urltest_timeout', _('Timeout (ms)'),
            _('Timeout for URL test in milliseconds.'));
        o.datatype = 'min(1000)';
        o.default = '5000';
        o.placeholder = '5000';

        o = s.taboption('urltest', form.Flag, 'auto_refresh_on_fail', _('Auto Refresh on Failure'),
            _('Automatically refresh subscription if no servers are available.'));
        o.default = '1';

        o = s.taboption('urltest', form.Value, 'max_refresh_attempts', _('Max Refresh Attempts'),
            _('Maximum number of consecutive refresh attempts when no servers are available.'));
        o.datatype = 'range(1,10)';
        o.default = '3';

        o = s.taboption('urltest', form.Flag, 'auto_restart', _('Auto Restart'),
            _('Automatically restart sing-box if it crashes.'));
        o.default = '1';

        // --- Network Tab ---

        o = s.taboption('network', form.Value, 'interface_name', _('Interface Name'),
            _('Name of the TUN network interface. Used for integration with podkop and routing.'));
        o.default = 'vlessmanager';
        o.placeholder = 'vlessmanager';
        o.validate = function (section_id, value) {
            if (!/^[a-zA-Z][a-zA-Z0-9_]{0,14}$/.test(value))
                return _('Interface name must be 1-15 alphanumeric characters, starting with a letter');
            return true;
        };

        o = s.taboption('network', form.Value, 'tun_address', _('TUN IPv4 Address'),
            _('IPv4 address for the TUN interface in CIDR format.'));
        o.default = '172.19.0.1/30';
        o.placeholder = '172.19.0.1/30';
        o.datatype = 'cidr4';

        o = s.taboption('network', form.Value, 'tun_address6', _('TUN IPv6 Address'),
            _('IPv6 address for the TUN interface in CIDR format.'));
        o.default = 'fdfe:dcba:9876::1/126';
        o.placeholder = 'fdfe:dcba:9876::1/126';
        o.datatype = 'cidr6';

        o = s.taboption('network', form.Value, 'tun_mtu', _('MTU'));
        o.datatype = 'range(1280,9000)';
        o.default = '9000';

        o = s.taboption('network', form.ListValue, 'tun_stack', _('TUN Stack'));
        o.value('system', 'System');
        o.value('gvisor', 'gVisor');
        o.value('mixed', 'Mixed');
        o.default = 'mixed';

        o = s.taboption('network', form.Value, 'dns_server', _('DNS Server'),
            _('DNS server for DNS-over-HTTPS through the tunnel.'));
        o.default = '1.1.1.1';
        o.placeholder = '1.1.1.1';
        o.datatype = 'ipaddr';

        // --- Advanced Tab ---

        o = s.taboption('advanced', form.Value, 'log_file', _('Log File'));
        o.default = '/var/log/vlessmanager.log';

        o = s.taboption('advanced', form.Value, 'singbox_config', _('Sing-box Config Path'));
        o.default = '/var/run/vlessmanager/singbox.json';

        o = s.taboption('advanced', form.Value, 'cache_file', _('Cache File Path'));
        o.default = '/var/run/vlessmanager/subscribe_cache.txt';

        // --- Servers Tab ---

        o = s.taboption('servers', form.DummyValue, '_servers_list', _('Current Servers'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            if (!servers.servers || servers.servers.length === 0) {
                return '<div style="padding:15px;text-align:center;color:#888;">' +
                    '<em>' + _('No servers loaded. Click "Force Update" to fetch subscription.') + '</em></div>';
            }

            var html = '<div style="margin:10px 0;">';
            html += '<p><strong>' + _('Total servers: ') + servers.count + '</strong></p>';
            html += '<div style="max-height:400px;overflow-y:auto;">';
            html += '<table class="table" style="width:100%;">';
            html += '<tr class="tr table-titles">';
            html += '<th class="th">#</th>';
            html += '<th class="th">' + _('Name') + '</th>';
            html += '<th class="th">' + _('Host') + '</th>';
            html += '<th class="th">' + _('Port') + '</th>';
            html += '<th class="th">' + _('Transport') + '</th>';
            html += '<th class="th">' + _('Security') + '</th>';
            html += '</tr>';

            for (var i = 0; i < servers.servers.length; i++) {
                var srv = servers.servers[i];
                html += '<tr class="tr">';
                html += '<td class="td">' + (i + 1) + '</td>';
                html += '<td class="td" style="word-break:break-all;">' + (srv.name || '-') + '</td>';
                html += '<td class="td">' + (srv.host || '-') + '</td>';
                html += '<td class="td">' + (srv.port || '-') + '</td>';
                html += '<td class="td"><span class="label">' + (srv.transport || 'tcp') + '</span></td>';
                html += '<td class="td"><span class="label">' + (srv.security || 'none') + '</span></td>';
                html += '</tr>';
            }

            html += '</table></div></div>';
            return html;
        };

        // --- Log Tab ---

        o = s.taboption('log', form.DummyValue, '_log_content', _('Service Log'));
        o.rawhtml = true;
        o.cfgvalue = function () {
            var logText = logContent || _('No log entries');
            // Replace \n with actual newlines for display
            logText = logText.replace(/\\n/g, '\n');

            return '<div style="margin:10px 0;">' +
                '<button class="cbi-button cbi-button-action" style="margin-bottom:10px;" ' +
                'onclick="document.dispatchEvent(new CustomEvent(\'vlessmanager-action\', {detail:\'log\'}))">' +
                _('Refresh Log') + '</button>' +
                '<pre style="max-height:500px;overflow:auto;background:#1a1a2e;color:#e0e0e0;' +
                'padding:15px;border-radius:6px;font-size:12px;line-height:1.5;white-space:pre-wrap;' +
                'word-wrap:break-word;font-family:\'Courier New\',monospace;">' +
                logText + '</pre></div>';
        };

        return m.render();
    }
});

'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require fs';

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
				}
				catch (e) {
					return { status: 'unknown', message: 'Parse error' };
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
				}
				catch (e) {
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
					return JSON.parse(res.stdout.trim()).log || '';
				}
				catch (e) {
					return '';
				}
			})
			.catch(function () {
				return '';
			});
	},

	handleAction: function (action) {
		ui.showModal(_('VlessManager'), [
			E('p', { 'class': 'spinning' }, _('Executing: %s...').format(action))
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
				ui.addNotification(null, E('p', _('Error: %s').format(err.message)), 'error');
			});
	},

	render: function (data) {
		var status = data[1] || {};
		var servers = data[2] || {};
		var logContent = data[3] || '';
		var self = this;
		var m, s, o;

		m = new form.Map('vlessmanager', _('VlessManager'),
			_('VLESS proxy manager with subscription updates, active health checking, automatic server failover, and TUN interface for podkop.'));

		s = m.section(form.NamedSection, 'main', 'vlessmanager', _('VlessManager'));
		s.anonymous = true;
		s.addremove = false;

		/* Объявляем вкладки ОДИН раз */
		s.tab('status', _('Status & Control'));
		s.tab('general', _('General'));
		s.tab('filter', _('Filters'));
		s.tab('urltest', _('URL Test & Health Check'));
		s.tab('network', _('Network'));
		s.tab('advanced', _('Advanced'));
		s.tab('servers', _('Servers'));
		s.tab('log', _('Log'));

		/* ==================== STATUS ==================== */
		o = s.taboption('status', form.DummyValue, '_status', _('Service Status'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			var sc = 'label notice';
			var st = (status.status || 'unknown').toUpperCase();

			switch (status.status) {
			case 'running':
				sc = 'label success';
				break;
			case 'stopped':
				sc = 'label warning';
				break;
			case 'error':
				sc = 'label danger';
				break;
			}

			var html = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
			html += '<span class="' + sc + '" style="padding:5px 12px;border-radius:4px;font-weight:bold;">' + st + '</span>';

			if (status.message)
				html += '<span style="color:#555;">' + status.message + '</span>';

			if (status.server_count > 0)
				html += '<span class="label" style="padding:3px 8px;">Servers: ' + status.server_count + '</span>';

			if (status.healthcheck) {
				var hc = status.healthcheck;
				if (hc.running) {
					html += (hc.fail_count > 0)
						? '<span class="label warning" style="padding:3px 8px;">HC: ' + hc.fail_count + ' fails</span>'
						: '<span class="label success" style="padding:3px 8px;">HC: OK</span>';
				}
				else {
					html += '<span class="label notice" style="padding:3px 8px;">HC: stopped</span>';
				}
			}

			if (status.last_update)
				html += '<span style="color:#888;font-size:0.9em;">Updated: ' + status.last_update + '</span>';

			if (status.version)
				html += '<span style="color:#aaa;font-size:0.85em;">v' + status.version + '</span>';

			html += '</div>';
			return html;
		};

		o = s.taboption('status', form.DummyValue, '_controls', _('Controls'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			return '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
				'<button class="cbi-button cbi-button-apply" id="btn-start">' + _('Start') + '</button>' +
				'<button class="cbi-button cbi-button-reset" id="btn-stop">' + _('Stop') + '</button>' +
				'<button class="cbi-button cbi-button-action" id="btn-restart">' + _('Restart') + '</button>' +
				'<button class="cbi-button cbi-button-action" id="btn-update">' + _('Force Update') + '</button>' +
				'<button class="cbi-button" id="btn-healthcheck">' + _('Test Now') + '</button>' +
				'</div>';
		};

		/* ==================== GENERAL ==================== */
		o = s.taboption('general', form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'subscribe_url', _('Subscription URL'),
			_('Raw text URL with VLESS configs (one per line). Supports base64-encoded content.'));
		o.rmempty = false;
		o.placeholder = 'https://raw.githubusercontent.com/user/repo/main/configs.txt';
		o.validate = function (sid, v) {
			if (!v)
				return _('Required');
			if (!/^https?:\/\//.test(v))
				return _('Must start with http(s)://');
			return true;
		};

		o = s.taboption('general', form.Value, 'update_interval', _('Update Interval (min)'),
			_('Subscription refresh interval. Minimum 5 minutes.'));
		o.datatype = 'min(5)';
		o.default = '60';

		o = s.taboption('general', form.ListValue, 'log_level', _('Log Level'));
		o.value('trace');
		o.value('debug');
		o.value('info');
		o.value('warn');
		o.value('error');
		o.value('fatal');
		o.default = 'warn';

		/* ==================== FILTER ==================== */
		o = s.taboption('filter', form.Value, 'include_regex', _('Include Regex'),
			_('Only include configs matching this regex (applied to name after #). Empty = all.'));
		o.placeholder = '(US|DE|NL)';

		o = s.taboption('filter', form.Value, 'exclude_regex', _('Exclude Regex'),
			_('Exclude configs matching this regex.'));
		o.placeholder = '(expired|test)';

		/*
		 * Важно:
		 * backend у тебя сейчас ждёт строку вида "all" или "tcp,ws,xhttp".
		 * Поэтому здесь лучше обычное текстовое поле, а не MultiValue.
		 */
		o = s.taboption('filter', form.Value, 'transport_filter', _('Transport Filter'),
			_('Allowed transport types: all, tcp, ws, xhttp, grpc, http or comma-separated list like tcp,ws,xhttp'));
		o.default = 'all';
		o.placeholder = 'all';

		/* ==================== URLTEST ==================== */
		o = s.taboption('urltest', form.Value, 'urltest_url', _('URL Test URL'),
			_('URL for both sing-box urltest and active health check.'));
		o.default = 'https://www.gstatic.com/generate_204';

		o = s.taboption('urltest', form.Value, 'urltest_interval', _('Sing-box Test Interval (sec)'),
			_('Internal sing-box urltest interval between outbound servers.'));
		o.datatype = 'min(30)';
		o.default = '300';

		o = s.taboption('urltest', form.Value, 'urltest_tolerance', _('Tolerance (ms)'));
		o.datatype = 'min(0)';
		o.default = '50';

		o = s.taboption('urltest', form.Value, 'urltest_timeout', _('Timeout (ms)'));
		o.datatype = 'min(1000)';
		o.default = '5000';

		o = s.taboption('urltest', form.Value, 'healthcheck_interval', _('Health Check Interval (min)'),
			_('How often the external health check daemon tests connectivity through the TUN.'));
		o.datatype = 'min(1)';
		o.default = '5';

		o = s.taboption('urltest', form.Value, 'healthcheck_max_fails', _('Max Consecutive Failures'),
			_('Number of consecutive health check failures before triggering failover/restart.'));
		o.datatype = 'range(1,10)';
		o.default = '2';

		o = s.taboption('urltest', form.Flag, 'auto_refresh_on_fail', _('Auto Refresh on Failure'),
			_('Re-download subscription if restart does not help.'));
		o.default = '1';

		o = s.taboption('urltest', form.Value, 'max_refresh_attempts', _('Max Refresh Attempts'));
		o.datatype = 'range(1,10)';
		o.default = '3';

		o = s.taboption('urltest', form.Flag, 'auto_restart', _('Auto Restart'),
			_('Restart sing-box if it crashes.'));
		o.default = '1';

		/* ==================== NETWORK ==================== */
		o = s.taboption('network', form.Value, 'interface_name', _('Interface Name'),
			_('TUN interface name. Visible in Network / Interfaces for use with podkop.'));
		o.default = 'vlessmanager';
		o.validate = function (sid, v) {
			return /^[a-zA-Z][a-zA-Z0-9_]{0,14}$/.test(v)
				? true
				: _('1-15 alphanumeric characters, starting with letter');
		};

		o = s.taboption('network', form.Value, 'tun_address', _('TUN IPv4'));
		o.default = '172.19.0.1/30';
		o.datatype = 'cidr4';

		o = s.taboption('network', form.Value, 'tun_address6', _('TUN IPv6'));
		o.default = 'fdfe:dcba:9876::1/126';
		o.datatype = 'cidr6';

		o = s.taboption('network', form.Value, 'tun_mtu', _('MTU'));
		o.datatype = 'range(1280,9000)';
		o.default = '9000';

		o = s.taboption('network', form.ListValue, 'tun_stack', _('TUN Stack'));
		o.value('system');
		o.value('gvisor');
		o.value('mixed');
		o.default = 'mixed';

		o = s.taboption('network', form.Value, 'dns_server', _('DNS Server'));
		o.default = '1.1.1.1';
		o.datatype = 'ipaddr';

		/* ==================== ADVANCED ==================== */
		o = s.taboption('advanced', form.Value, 'log_file', _('Log File'));
		o.default = '/var/log/vlessmanager.log';

		o = s.taboption('advanced', form.Value, 'singbox_config', _('Sing-box Config'));
		o.default = '/var/run/vlessmanager/singbox.json';

		o = s.taboption('advanced', form.Value, 'cache_file', _('Cache File'));
		o.default = '/var/run/vlessmanager/subscribe_cache.txt';

		/* ==================== SERVERS ==================== */
		o = s.taboption('servers', form.DummyValue, '_srvlist', _('Loaded Servers'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			if (!servers.servers || !servers.servers.length) {
				return '<div style="padding:20px;text-align:center;color:#888;">' +
					'<em>' + _('No servers. Press "Force Update".') + '</em></div>';
			}

			var h = '<p><strong>Total: ' + servers.count + '</strong></p>' +
				'<div style="max-height:400px;overflow-y:auto;">' +
				'<table class="table" style="width:100%">' +
				'<tr class="tr table-titles">' +
				'<th class="th">#</th>' +
				'<th class="th">Name</th>' +
				'<th class="th">Host</th>' +
				'<th class="th">Port</th>' +
				'<th class="th">Transport</th>' +
				'<th class="th">Security</th>' +
				'</tr>';

			for (var i = 0; i < servers.servers.length; i++) {
				var sv = servers.servers[i];
				h += '<tr class="tr">' +
					'<td class="td">' + (i + 1) + '</td>' +
					'<td class="td" style="word-break:break-all;">' + (sv.name || '-') + '</td>' +
					'<td class="td">' + (sv.host || '-') + '</td>' +
					'<td class="td">' + (sv.port || '-') + '</td>' +
					'<td class="td"><span class="label">' + (sv.transport || 'tcp') + '</span></td>' +
					'<td class="td"><span class="label">' + (sv.security || 'none') + '</span></td>' +
					'</tr>';
			}

			h += '</table></div>';
			return h;
		};

		/* ==================== LOG ==================== */
		o = s.taboption('log', form.DummyValue, '_logview', _('Log'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			var t = (logContent || _('No log')).replace(/\\n/g, '\n');
			return '<button class="cbi-button cbi-button-action" style="margin-bottom:10px;" id="btn-refresh-log">' +
				_('Refresh') + '</button>' +
				'<pre style="max-height:500px;overflow:auto;background:#1a1a2e;color:#e0e0e0;padding:15px;border-radius:6px;font-size:12px;line-height:1.5;font-family:monospace;white-space:pre-wrap;">' +
				t + '</pre>';
		};

		return m.render().then(function (node) {
			var btnMap = {
				'btn-start': 'start',
				'btn-stop': 'stop',
				'btn-restart': 'restart',
				'btn-update': 'update',
				'btn-healthcheck': 'healthcheck'
			};

			Object.keys(btnMap).forEach(function (id) {
				var btn = node.querySelector('#' + id);
				if (!btn)
					return;

				btn.addEventListener('click', function (ev) {
					ev.preventDefault();

					if (btnMap[id] === 'healthcheck') {
						fs.exec('/usr/bin/vlessmanager', ['healthcheck'])
							.then(function (res) {
								try {
									var r = JSON.parse(res.stdout.trim());
									var msg = r.healthy
										? _('Health check PASSED')
										: _('Health check FAILED (fail count: %d)').format(r.fail_count);
									ui.addNotification(null, E('p', msg), r.healthy ? 'info' : 'warning');
								}
								catch (e) {
									ui.addNotification(null, E('p', res.stdout), 'info');
								}
							})
							.catch(function (err) {
								ui.addNotification(null, E('p', err.message), 'error');
							});
					}
					else {
						self.handleAction(btnMap[id]);
					}
				});
			});

			var logBtn = node.querySelector('#btn-refresh-log');
			if (logBtn) {
				logBtn.addEventListener('click', function (ev) {
					ev.preventDefault();
					self.getLog().then(function (log) {
						var pre = node.querySelector('pre');
						if (pre)
							pre.textContent = (log || _('No log')).replace(/\\n/g, '\n');
					});
				});
			}

			return node;
		});
	}
});

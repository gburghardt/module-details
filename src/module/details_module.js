Module.DetailsModule = Module.Base.extend({

	prototype: {

		identifierPrefix: "details",

		lastRequest: null,

		options: {
			autoLoad: true,
			url: null,
			method: "GET",
			view: null,
			identifier: null
		},

		view: null,

		xhr: null,

		_ready: function() {
			Module.Base.prototype._ready.call(this);

			if (!this.options.url) {
				throw new Error("Missing required option: url");
			}

			if (this.options.identifier) {
				this.subscribe(this.identifierPrefix + "." + this.options.identifier + ".changed", this, this.handleDetailsChanged);
			}

			if (this.options.autoLoad) {
				this._loadFromUrl(this.options.url, this.options.method, this.element);
			}
		},

		destructor: function (keepElement) {
			if (this.xhr) {
				this.xhr.abort();
				this.xhr = null;
			}

			this.lastRequest = null;

			Module.Base.prototype.destructor.call(this, keepElement);
		},

		close: function click(event, element, params) {
			event.stop();
			this.destructor();
		},

		_getView: function() {
			return this.options.view || this.view;
		},

		handleDetailsChanged: function(publisher, data) {
			this._retry(this.lastRequest);
		},

		load: function click(event, element, params) {
			if (params.stop) {
				event.stop();
			}
			else {
				event.preventDefault();
			}

			var url = element.getAttribute("href") || element.getAttribute("data-details-url"),
			    method = element.getAttribute("data-details-method") || "GET";

			this._loadFromUrl(url, method, this.element);
		},

		_loadFromUrl: function(url, method, target) {
			this.lastRequest = { url: url, method: method, target: target };
			this._loading(target);

			if (this.xhr) {
				this.xhr.abort();
			}

			var	xhr = new XMLHttpRequest(),
				self = this,
				found = function() {
					var type = xhr.getResponseHeader("content-type");

					if (/text\/html/.test(type)) {
						target.innerHTML = xhr.responseText;
						complete();
					}
					else if (/(text|application)\/json/.test(type)) {
						var view = self._getView();

						if (!view) {
							throw new Error("Missing one of view or options.view");
						}

						self.render(view, JSON.parse(xhr.responseText), target)
							.done(function() {
								complete();
							});
					}
					else {
						complete();
						throw new Error("Unknown HTTP response type: " + type);
					}
				},
				notFound = function() {
					target.innerHTML = xhr.responseText;
					complete();
				},
				error = function() {
					self.element.innerHTML = [
						'<p class="details-error">',
							'An unknown problem occurred. ',
							'<button type="button" data-actions="' + self.controllerId + '.retry">Try Again</button>',
						'</p>'
					].join("");

					complete();
				},
				complete = function() {
					self._loaded(target);

					target =
						xhr =
						xhr.onreadystatechange =
						self =
						self.xhr =
					null;
				},
				onreadystatechange = function() {
					if (this.readyState === 4) {
						if (this.status === 200) {
							found();
						}
						else if (this.status === 404) {
							notFound();
						}
						else {
							error();
						}
					}
				};

			this.xhr = xhr;

			xhr.onreadystatechange = onreadystatechange;
			xhr.open(method, url);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			xhr.send(null);
		},

		_retry: function(lastRequest) {
			this._loadFromUrl(lastRequest.url, lastRequest.method, lastRequest.target);
		},

		retry: function click(event, element, params) {
			event.stop();
			this._retry(this.lastRequest);
		}

	}

});

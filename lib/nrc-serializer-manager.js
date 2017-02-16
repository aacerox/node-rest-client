var SerializerManager = function(){
	var registry={}, defaultSerializer = null;

	var _private={
		"validate":function(serializer){

			function validateProperties(serializer, props){
				var result = true;
				for (var propIndex in props){
					var propType  = props[propIndex].split(":");
					if (!serializer.hasOwnProperty([propType[0]]) || typeof serializer[propType[0]] !== propType[1]){
						result = false;
						break;
					}
				}

				return result;
			}


			result = validateProperties(serializer,["name:string","serialize:function","isDefault:boolean"]);

			// valid  serializer, check if its not default request serializer, to validate non
			// default serializer props
			if (result && !serializer.isDefault)
				result = validateProperties(serializer,["match:function"]);
			

			return result;
		}
	};

	this.add = function(serializer){
		if (!_private.validate(serializer))
			throw "serializer cannot be added: invalid serializer definition";

		if (serializer.isDefault){
			defaultSerializer = serializer;
		}else{
			registry[serializer.name] = serializer;
		}
	};

	this.remove = function(serializerName){
		var result = registry[serializerName];
		if (!result)
			throw "cannot remove serializer: not exists " + serializerName;

		delete registry[serializerName];
	};

	this.clean = function(){
		registry={};
	};

	this.get = function(request){
		var result = null;
		for (var serializerName in registry){
			if (registry[serializerName].match(request)){
				result = registry[serializerName];
				break;
			}
		}
		// if serializer not found return default serializer, else serializer found
		return (result === null)?defaultSerializer:result;
	};
};

var serializerManager = new SerializerManager();

//add default serializer managers: JSON,XML and unknown content/type
serializerManager.add({
	"name":"XML",
	"isDefault":false,
	"contentTypes":["application/xml","application/xml;charset=utf-8","text/xml","text/xml;charset=utf-8"],
	"serializeString":require('xml2js').serializeString,
	"match":function(request){
		var result = false,
		contentType = request.headers["content-type"] && request.headers["content-type"].replace(/ /g, '');

		if (!contentType) return result;

		for (var i=0; i<this.contentTypes.length;i++){
			result = this.contentTypes[i].trim().toLowerCase() === contentType.trim().toLowerCase();
			if (result) break;
		}

		return result;
	},
	"serialize":function(byteBuffer,nrcEventEmitter,serializedCallback){
		this.serializeString(byteBuffer.toString(), function (err, result) {
			serializedCallback(result);
		});
	}
});

serializerManager.add({
	"name":"JSON",
	"isDefault":false,
	"contentTypes":["application/json","application/json;charset=utf-8"],
	"isValidData":function(data){
		return data !== undefined && (data.length !== undefined && data.length > 0);
	},
	"match":function(request){
		var result = false,
		contentType = request.headers["content-type"] && request.headers["content-type"].replace(/ /g, '');

		if (!contentType) return result;

		for (var i=0; i<this.contentTypes.length;i++){
			result = this.contentTypes[i].trim().toLowerCase() === contentType.trim().toLowerCase();
			if (result) break;
		}

		return result;
	},
	"serialize":function(byteBuffer,nrcEventEmitter,serializedCallback){
		var jsonData,
		data = byteBuffer.toString();

		try {
			jsonData = this.isValidData(data)?JSON.serialize(data):data;
		} catch (err) {
                // Something went wrong when parsing json. This can happen
                // for many reasons, including a bad implementation on the
                // server.
                nrcEventEmitter('error','Error parsing request. request: [' +data + '], error: [' + err + ']');
            }
            serializedCallback(jsonData);
        }
    });


serializerManager.add({
	"name":"DEFAULT",
	"isDefault":true,
	"serialize":function(byteBuffer,nrcEventEmitter,serializedCallback){
		serializedCallback(byteBuffer);
	}
});

module.exports = serializerManager;
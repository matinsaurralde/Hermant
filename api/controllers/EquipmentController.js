/**
 * EquipmentController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  /*
    Direccionamos al view para agregar un nuevo equipo a la base de datos del sistema.
  */
  new_equipment: async function(req,res){
    return res.view('pages/equipment/new_equipment');
  },
  /*
    Creamos un nuevo equipo en la base de datos del sistema.
  */
  create: async function(req,res){
    var designation = String(req.param('designacion'));
		var brand = String(req.param('marca'));
		var model = String(req.param('modelo'));
		var totalHours = Number(req.param('horasTotales'));
		var partialHours = Number(req.param('horasParciales'));

		var code = String(req.param('codigo'));
		var serialNumber = String(req.param('nroSerie'));
		var origin = String(req.param('origen'));
		var manufDate = String(req.param('fechaFab'));
		var serviceDate = String(req.param('fechaServicio'));

    var power = Number(req.param('potencia'));
		var weight = Number(req.param('peso'));
		var price = Number(req.param('precio'));
		var observations = String(req.param('observaciones'));

    var constructionSite = await ConstructionSite.findOne({code:'T01'});

    var equipment = await Equipment.create({designation,brand,model,totalHours,partialHours,code,
                                      serialNumber,origin,manufDate,serviceDate,
                                      power,weight,price,observations, constructionSite:constructionSite.id});

    return res.redirect('/equipment/list');
  },

  /*
    Creamos un nuevo equipo en la base de datos del sistema.
  */
  update: async function(req,res){
    var equipment = await Equipment.findOne({id:req.param('id')});

    Equipment.update(equipment, {designation:req.param('d'),brand:req.param('b')});

    res.redirect('/equipment/list');

  },

  /*
    Editamos el equipo
  */
  edit: async function(req,res){
    var idEquipment = req.param('idEquipment');
    var equipment = await Equipment.findOne({id:idEquipment});
    return res.view('pages/equipment/new_equipment', {editEquipment:equipment});
  },

  edited: async function(req,res){
    var idEquipment = req.param('idEquipment');

    var designation = String(req.param('designacion'));
		var brand = String(req.param('marca'));
		var model = String(req.param('modelo'));
		var totalHours = Number(req.param('horasTotales'));
		var partialHours = Number(req.param('horasParciales'));

		var code = String(req.param('codigo'));
		var serialNumber = String(req.param('nroSerie'));
		var origin = String(req.param('origen'));
		var manufDate = String(req.param('fechaFab'));
		var serviceDate = String(req.param('fechaServicio'));

    var power = Number(req.param('potencia'));
		var weight = Number(req.param('peso'));
		var price = Number(req.param('precio'));
		var observations = String(req.param('observaciones'));

    await Equipment.update({id:idEquipment}).set({
      designation,brand,model,totalHours,partialHours,code,
      serialNumber,origin,manufDate,serviceDate,
      power,weight,price,observations
    });

    return res.redirect('/equipment/list');
  },

  /*
    Buscamos todos los equipos registrados en el sistema y llamamos al
    view para mostrar una lista de los equipos.
  */
  list_view: async function(req,res){

   var equipments = await Equipment.find({}).sort([{code:'ASC'},{designation:'ASC'},{brand:'ASC'},{createdAt:'ASC'}]).populate('costIndexes');
   var costIndexes = await EquipmentCostIndex.find({}).sort([{createdAt:'DESC'}]);

   var lastCostIndexes = [];

   for(equipment of equipments){
     for(costIndex of costIndexes){
       if(costIndex.equipment === equipment.id){
         lastCostIndexes.push(costIndex);
         break;
       }
     }
   }
   //console.log(equipment.length == lastCostIndexes.length);
   var nextMaintenanceMap = new Map();
   var hoursToNextMaintenanceMap = new Map();
   var prevMaintenanceMap = new Map();

   for(equipment of equipments){
     if(equipment.lubricationSheet != null){
       var sheetRows = await LubricationSheetRow.find({lubricationSheet:equipment.lubricationSheet});
       var uniqueMaintFreqs = await MaintenanceFrequency.find({lubricationSheetRow:sheetRows[0].id});
       var uniqueFreqs = [];
       for(uMF of uniqueMaintFreqs){
         uniqueFreqs.push(uMF.frequency);
       }
       var partialHours2 = equipment.partialHours;
       var nextMaintenance = 0;
       var prevMaintenance = 0;
       var hoursToNextMaintenance = 0;
       var partialHours = 0;

       partialHours = partialHours2;
       for(var i = uniqueFreqs.length-1; i>=0 ; i--){
         if(partialHours >= uniqueFreqs[uniqueFreqs.length-1]){
           partialHours -= uniqueFreqs[uniqueFreqs.length-1];
         }
         if(partialHours < uniqueFreqs[i]){
           nextMaintenance = uniqueFreqs[i];
           if (i > 0){
             prevMaintenance = uniqueFreqs[i - 1]
           } else {
             prevMaintenance = 0;
           }
         }
       }
       hoursToNextMaintenance = nextMaintenance - partialHours2;
       hoursToNextMaintenanceMap.set(equipment.id, hoursToNextMaintenance);
       nextMaintenanceMap.set(equipment.id, nextMaintenance);
       prevMaintenanceMap.set(equipment.id, prevMaintenance);
     } else {
       hoursToNextMaintenanceMap.set(equipment.id, 0);
       nextMaintenanceMap.set(equipment.id, 0);
       prevMaintenanceMap.set(equipment.id, 0);
     }
   }

   if(!equipments){
     // No se encontraron equipos registrados.
     return res.redirect('/');
   }else{
     return res.view('pages/equipment/equipment_list', {equipments, lastCostIndexes, hoursToNextMaintenanceMap, nextMaintenanceMap, prevMaintenanceMap});
   }
 },

  details_view: async function(req,res){

    var equipmentId = req.param('idEquip');
    var equipment = await Equipment.findOne({id:equipmentId}).populate('constructionSite');
    var maintenances = await Maintenance.find({equipment:equipmentId}).populate('maintenanceRows');
    var repairs = await Repair.find({equipment:equipmentId}).populate('repairRows');

    var hoursToNextMaintenance = 0;
    var prevMaintenance = 0;
    var nextMaintenance = 0;

    if(equipment.lubricationSheet != null){
      var sheetRows = await LubricationSheetRow.find({lubricationSheet:equipment.lubricationSheet});
      var uniqueMaintFreqs = await MaintenanceFrequency.find({lubricationSheetRow:sheetRows[0].id});
      var uniqueFreqs = [];
      for(uMF of uniqueMaintFreqs){
        uniqueFreqs.push(uMF.frequency);
      }
      var partialHours2 = equipment.partialHours;
      var partialHours = 0;

      partialHours = partialHours2;
      for(var i = uniqueFreqs.length-1; i>=0 ; i--){
        if(partialHours >= uniqueFreqs[uniqueFreqs.length-1]){
          partialHours -= uniqueFreqs[uniqueFreqs.length-1];
        }
        if(partialHours < uniqueFreqs[i]){
          nextMaintenance = uniqueFreqs[i];
          if (i > 0){
            prevMaintenance = uniqueFreqs[i - 1]
          } else {
            prevMaintenance = 0;
          }
        }
      }
      hoursToNextMaintenance = nextMaintenance - partialHours2;
    }

    if(equipment){
      if(maintenances){
        return res.view('pages/equipment/equipment_details', {equipment, maintenances, repairs, hoursToNextMaintenance, nextMaintenance, prevMaintenance});
      }else{
        return res.view('pages/equipment/equipment_details', {equipment, hoursToNextMaintenance, nextMaintenance, prevMaintenance});
      }
    }else{
      return res.redirect('/equipment/list');
    }

  },

  /*
    Eliminamos un equipo
  */
  delete: async function(req,res){
    var idEquip = req.param('idEquip');

    await Equipment.destroy({id:idEquip});

    return res.redirect('/equipment/list');
  },

  setSite: async function(req, res){
      var idEquipo = req.param('idEquip');
      var idSite = req.param('idSite');
      var criticality = req.param('equipmentSiteCriticality');

      console.log(idEquipo + ' ' + idSite);
      var equipment = await Equipment.updateOne({id:idEquipo}).set({constructionSite:idSite, siteCriticality:criticality});
      return res.redirect('/site/details/' + idSite);
  },
  deleteSite: async function(req, res){
      var idEquipo = req.param('idEquip');
      var idSite = req.param('idSite');
      var idSiteTaller = 1; //se pone en el id del taller
      var equipment = await Equipment.updateOne({id:idEquipo}).set({constructionSite:idSiteTaller, siteCriticality:0});
      return res.redirect('/site/details/' + idSite);
    }

};

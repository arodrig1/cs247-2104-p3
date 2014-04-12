/* GET home page. */
exports.index = function(req, res){
  res.render('index', { title: 'CS247 Project 3' });
};

exports.versionA = function(req, res){
  res.render('homeA', { title: 'CS247 Prototype A' });
};

exports.versionB = function(req, res){
  res.render('homeB', { title: 'CS247 Prototype B' });
};

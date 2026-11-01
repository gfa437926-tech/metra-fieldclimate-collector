import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// Unified station list. apiBaseUrl must point to the secure backend.
class StationsScreen extends StatefulWidget {
  const StationsScreen({super.key, required this.apiBaseUrl});
  final String apiBaseUrl;
  @override
  State<StationsScreen> createState() => _StationsScreenState();
}
class _StationsScreenState extends State<StationsScreen> {
  String source='all', search='';
  bool loading=true;
  String? error;
  List<Map<String,dynamic>> stations=[];
  @override
  void initState(){super.initState();loadStations();}
  Future<void> loadStations() async {
    setState((){loading=true;error=null;});
    try {
      final uri=Uri.parse('${widget.apiBaseUrl}/api/v1/stations').replace(queryParameters:{'source':source,if(search.trim().isNotEmpty)'search':search.trim()});
      final response=await http.get(uri).timeout(const Duration(seconds:25));
      if(response.statusCode!=200)throw Exception('تعذر تحميل المحطات (${response.statusCode})');
      final decoded=jsonDecode(response.body) as Map<String,dynamic>;
      final items=(decoded['items'] as List? ?? []).whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList();
      if(!mounted)return;setState((){stations=items;loading=false;});
    } catch(e){if(!mounted)return;setState((){error=e.toString();loading=false;});}
  }
  @override
  Widget build(BuildContext context)=>Directionality(textDirection:TextDirection.rtl,child:Scaffold(
    appBar:AppBar(title:const Text('محطات الأرصاد'),actions:[IconButton(onPressed:loadStations,icon:const Icon(Icons.refresh))]),
    body:Column(children:[
      Padding(padding:const EdgeInsets.all(16),child:TextField(decoration:const InputDecoration(prefixIcon:Icon(Icons.search),hintText:'ابحث باسم المحطة أو معرفها',border:OutlineInputBorder()),onChanged:(v){search=v;loadStations();})),
      Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:SegmentedButton<String>(segments:const [ButtonSegment(value:'all',label:Text('الكل')),ButtonSegment(value:'classic',label:Text('METRA')),ButtonSegment(value:'fieldclimate',label:Text('FieldClimate'))],selected:{source},onSelectionChanged:(v){setState(()=>source=v.first);loadStations();})),
      const SizedBox(height:8),Expanded(child:loading?const Center(child:CircularProgressIndicator()):error!=null?Center(child:Text(error!,textAlign:TextAlign.center)):stations.isEmpty?const Center(child:Text('لا توجد محطات مطابقة')):RefreshIndicator(onRefresh:loadStations,child:ListView.separated(padding:const EdgeInsets.all(16),itemCount:stations.length,separatorBuilder:(_,__)=>const SizedBox(height:8),itemBuilder:(context,index){final item=stations[index];final isField=item['source']=='fieldclimate';return Card(child:ListTile(leading:Icon(isField?Icons.sensors:Icons.cloud),title:Text(item['name']?.toString()??'محطة دون اسم'),subtitle:Text('${item['id']??''}\n${item['lastObservedAt']??'لا توجد قراءة حديثة'}'),isThreeLine:true,trailing:Chip(label:Text(isField?'FieldClimate':'METRA')),onTap:()=>Navigator.pushNamed(context,'/station-details',arguments:item)));})))
    ])));
}

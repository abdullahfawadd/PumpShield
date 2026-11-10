import pathlib,sys
root=pathlib.Path(__file__).parent
body=(root/sys.argv[1]).read_text(encoding='utf-8-sig')
common=(root/'capture-common.js').read_text(encoding='utf-8-sig')
(root/sys.argv[2]).write_text('async page=>{\n'+common+'\n'+body+'\n}',encoding='utf-8')

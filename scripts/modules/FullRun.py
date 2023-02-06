import os
import time
from random import randint

langs = ['cy','gu','de']
#langs = ['ar','he','cy','hr','pt','mi','es','de','fr','gu','urd','yi']
files = ['../../html/trees/default/default.md',
        '../../html/trees/Adult_Starter/en-GB-Adult_Starter.md',
        '../../html/trees/Pragmatic_Phrases/en-GB-Pragmatic_Phrases.md',
        '../../html/trees/Simple_Adult_Starter/en-GB-Simple_Adult_Starter.md']

# Ignore         '../../html/trees/Dictionary/en-GB-ManyThings.md',


# First create the po files
for file in files:

    fpath = os.path.dirname(file)
    filename = os.path.basename(file)
    f_name, f_ext = os.path.splitext(filename)

    return_value = os.system('node po-file-from-tree.js '+file+' > '+fpath+'/'+f_name+'.po')   
    time.sleep(randint(1,5))

i=1
        
# next translate the po files
for lang in langs:
    for file in files:

        fpath = os.path.dirname(file)
        filename = os.path.basename(file)
        f_name, f_ext = os.path.splitext(filename)
    
        return_value = os.system('node google-translate-pofile.js '+fpath+'/'+f_name+'.po '+lang+'  '+fpath+'/'+f_name+lang+'.po') 
        time.sleep(randint(1,5))



# now make the migration to pasco trees
for lang in langs:
    for file in files:

        fpath = os.path.dirname(file)
        filename = os.path.basename(file)
        f_name, f_ext = os.path.splitext(filename)
        
        return_value = os.system('node apply-po-translation-on-tree.js '+fpath+'/'+f_name+lang+'.po '+file+' > '+fpath+'/'+f_name+lang+'.md')    
        time.sleep(randint(1,5))



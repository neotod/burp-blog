import json
from time import sleep, time
from os import path, remove
from werkzeug.utils import secure_filename
from mysql.connector import Error as mysql_error
from flask import Flask, render_template, redirect, request, flash, session, abort, url_for, make_response

from scripts import urls
from scripts.common import Burp_Blog, Post
from scripts.database_stuff import Db_Functions

from http.client import TEMPORARY_REDIRECT, NOT_FOUND

burp = Burp_Blog()

@burp.app.route(urls.HOME)
def index():
    if request.method == 'GET':
        page = 1
        tag = None
        
        if 'tag' in request.args and 'page' in request.args:
            page = int(request.args['page'])
            tag = request.args['tag']

        elif 'page' in request.args:
            page = int(request.args['page'])

            last_url_param = burp.current_path.split('?')[-1].split('&')[-1].split('=')[0]
            if (last_url_param == 'tag') or (('tag' in burp.current_path) and ('page' in burp.current_path)):
                tag = burp.current_path.split('?')[-1].split('&')[0].split('=')[1]
                burp.current_path = request.full_path
                return redirect(f'/?tag={tag}&page={page}')

        elif 'tag' in request.args:
            tag = request.args['tag']

        posts_ = burp.get_posts(page, tag)

        if 'user' in session:
            user_fullname_ = session['user'][1]
        else:
            user_fullname_ = None

    burp.current_path = request.full_path
    pages_num_ = burp.get_pages_num(tag)

    tags_ = burp.posts_tags
    return render_template('index.html', posts=posts_, tags=tags_, pages_num=pages_num_, curpage=page, page_name='latest_posts', user_fullname=user_fullname_)


@burp.app.route(urls.LOGIN, methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        if 'user' in session:
            return redirect(urls.DASHBOARD)
        return render_template('login.html', page_name='login')

    elif request.method == 'POST':
        username = request.form['username'].lower()
        password = request.form['password']

        validation_res = burp.validate_login(username, password)
        if validation_res['uvalid'] and validation_res['pvalid']:
            session['user'] = (username, burp.get_user_fullname(username))
            return redirect(urls.HOME) # success

        elif not validation_res['uvalid']:
            flash('Username is not exist, try again or create an account.')
            return redirect(urls.LOGIN)
        
        elif not validation_res['pvalid']:
            flash('Password is not correct, try again.')
            return redirect(urls.LOGIN)


@burp.app.route(urls.REGISTER, methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name'].capitalize()
        lastname = request.form['lastname'].capitalize()
        username = request.form['username'].lower()
        password = request.form['password']
        r_password = request.form['r_password']
        email = request.form['email'].lower()

        validate_errs = burp.validate_register(username, password, r_password, email)

        if not validate_errs:
            burp.create_user(name, lastname, username, password, email)
            flash('You registered successfuly, you can login with your username now.', 'ok')

            return redirect(urls.REGISTER)

        else:
            for error in validate_errs:
                flash(error, 'errors')
            
            return redirect(urls.REGISTER)

    elif request.method == 'GET':
        if 'user' in session:
            return redirect(urls.DASHBOARD)
            
        return render_template('register.html', page_name='register')


@burp.app.route(urls.DASHBOARD)
def dashboard_get(part=None, subpart=None):
    if not part:
        return redirect(urls.DASHBOARD_WRITEPOST)


@burp.app.route(urls.DASHBOARD_WRITEPOST, methods=['GET'])
def dashbaord_get_writepost():
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    page_name_ = f'dashboard >> write-post'
    template_address = f'dashboard/write-post.html'

    return render_template(template_address, post_remainder=None,
                            page_name=page_name_, user_fullname=user_fullname_)


@burp.app.route(urls.DASHBOARD_ALLPOSTS)
def dashboard_get_allposts():
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    page_name_ = f'dashboard >> all-posts'
    template_address = f'dashboard/all-posts.html'
    username = session['user'][0]
    posts_ = burp.get_user_all_posts(username, sort_by_timestamp=True)

    return render_template(template_address, posts=posts_, page_name=page_name_, user_fullname=user_fullname_)


@burp.app.route(urls.DASHBOARD_ALLPOSTS_ACTIONS)
def dashboard_get_allposts_actions(action, post_id):
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    username = session['user'][0]
    
    user_posts = burp.get_user_all_posts(username)
    user_posts_ids = tuple([post.id for post in user_posts])

    if int(post_id) not in user_posts_ids:
        abort(404)
        

    if 'edit' in action: # action is "edit-post"
        page_name_ = f'dashboard >> all-posts >> edit-post'

        template_address = f'dashboard/write-post.html'
        username = session['user'][0]

        post = burp.get_post(post_id)
        post_tags = ', '.join(post.tags)
        post_remainder_ = {'id': post_id, 'subject': post.subject, 'image': post.image_url,
                            'preface': post.preface, 'content': post.content, 'tags': post_tags}

        # with js: disable finish button if user haven't changed any part of the post

        return render_template(template_address, edit_mode=True, post_remainder=post_remainder_, # it will render write-post template
            page_name=page_name_, user_fullname=user_fullname_)

    elif 'delete' in action: # action is "delete-post"
        if post_id.isdigit():
            burp.delete_post(int(post_id))
            flash('Post deleted successfully', 'ok')

        return redirect(urls.DASHBOARD_ALLPOSTS)


@burp.app.route(urls.DASHBOARD_SETTING)
@burp.app.route(urls.DASHBOARD_SETTING_PART)
def dashboard_get_setting(part=None):
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    page_name_ = f'dashboard >> setting'
    template_address = f'dashboard/setting.html'
    username = session['user'][0]
    user_info_ = burp.get_user_info(username)

    password_str = ''
    for _ in range(user_info_['password_len']):
        password_str += '●'
        
    user_info_['password_str'] = password_str

    edit_ = False
    if part:
        if part == 'edit':
            edit_ = True
            page_name_ += ' >> edit'

        else:
            return redirect(urls.DASHBOARD_SETTING)

    return render_template(template_address, user_info=user_info_, edit=edit_, page_name=page_name_, user_fullname=user_fullname_)


@burp.app.route(urls.DASHBOARD_WRITEPOST, methods=['POST'])
def dashboard_post_writepost():
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    page_name_ = f'dashboard >> write-post'
    template_address = f'dashboard/write-post.html'
        
    subject = request.form['subject'].capitalize()
    preface = request.form['preface'] if 'preface' in request.form else None
    content = request.form['content']
    tags_str = request.form['tags']

    tags = []
    if ',' in tags_str:
        for tag in tags_str.split(','):
            pretified_tag = tag.strip().capitalize()
            if tag not in tags:
                tags.append(pretified_tag)
    else:
        tags = (tags_str, )

    tags = tuple(tags)

    username = session['user'][0]

    if request.files['image']:
        image_file = request.files['image']
        s_imagename = secure_filename(image_file.filename)
        file_save_path = path.join('images', s_imagename)
        image_file.save(file_save_path)

    else:
        s_imagename = None

    burp.insert_post(subject, preface, content, s_imagename, username, tags)
    flash('Your post was added to the site successfully!', 'ok')
    return ''


@burp.app.route('/dashboard/write-post/<edit_part>', methods=['POST'])
def dashboard_post_writepost_edit(edit_part):
    subject = request.form['subject'].capitalize()
    preface = request.form['preface'] if 'preface' in request.form else None
    content = request.form['content']
    tags_str = request.form['tags']

    tags = []
    if ',' in tags_str:
        for tag in tags_str.split(','):
            pretified_tag = tag.strip().capitalize()
            if tag not in tags:
                tags.append(pretified_tag)
    else:
        tags = (tags_str, )
    tags = tuple(tags)

    post_id = int(edit_part.split('-')[-1])
        
    post_prev = burp.get_post(post_id)
    if 'delete_img' in request.form:
        pnew_image_url = '_del_img_' # delete the image

    elif request.files['image']:
        pnew_image_name = secure_filename(request.files['image'].filename)
        pnew_image_url = r'images/{}'.format(pnew_image_name)
        
    else:
        pnew_image_url = post_prev.image_url # user didn't change the image


    def get_post_props(post): # it was so much tempting to do this, so blame me
        post_properties = {}

        for attr_name in dir(post):
            attr_value = getattr(post, attr_name)
            type_method = type(burp.delete_post) # type of a arbitrary method => 'method'

            if '__' not in attr_name and type(attr_value) != type_method:
                # just pick object's properties, namely all of the attributes except methods and default attributes (those with name __<attr_name>__)
                post_properties[attr_name] = attr_value

        return post_properties
    
    post_prev_items = get_post_props(post_prev)

    post_new = Post(post_id, subject, preface, content, pnew_image_url, tags, '')
    post_new_items = get_post_props(post_new)

    changed_parts = burp.get_item_changed_parts(post_prev_items, post_new_items)
    if not changed_parts:
        flash("Couldn't find any change in the editted post, so any part of your post won't change", 'errors')
        return redirect(urls.DASHBOARD_ALLPOSTS)


    # get written items errors
    written_post = Post(-1, subject, preface, content, '', tags, '')
    errors = burp.get_write_input_errors(written_post)

    if len(errors) > 0:
        for error in errors:
            # with js: make form inputs validation automatic

            flash(error, 'errors')

        post_remainder_ = {'subject': subject, 'preface': preface, 'content': content, 'tags': tags_str}
        return redirect(urls.DASHBOARD_ALLPOSTS + '/edit' + f'/{post_id}')
        

    if 'image_url' in changed_parts:
        if post_prev.image_url: # delete the old image (if post had image)
            old_image_url = post_prev.image_url
            remove(old_image_url)

        if changed_parts['image_url'] != '_del_img_': # change the post image to new image
            new_image_file = request.files['image']
            s_imagename = secure_filename(new_image_file.filename)
            file_save_path = path.join(r'F:\Projects\network\burp_blog\images', s_imagename)
            new_image_file.save(file_save_path)

        else: # let the post to be without image
            changed_parts['image_url'] = None

    burp.update_post(post_id, changed_parts)
    
    flash('Your post editted successfuly!', 'ok')
    return redirect(urls.DASHBOARD_ALLPOSTS)


@burp.app.route(urls.DASHBOARD_SETTING, methods=['POST'])
def dashboard_post_setting():
    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        return redirect(urls.LOGIN)

    template_address = f'dashboard/setting.html'

    username = session['user'][0]
    user_info = burp.get_user_info(username)

    name = request.form['name']
    lastname = request.form['lastname']
    new_password = request.form['new_password']
    rnew_password = request.form['rnew_password']
    email = request.form['email']

    user_new_items = {'name_': name, 'lastname': lastname, 'email': email}

    if new_password:
        new_password_hash = burp.get_password_hash(new_password)
        user_new_items['password_hash'] = new_password_hash


    changed_parts = burp.get_item_changed_parts(user_info, user_new_items)
    if changed_parts:
        if 'email' not in changed_parts:
            email = None

        validate_errs = burp.validate_register(None, new_password, rnew_password, email)
        
        if validate_errs:
            for error in validate_errs:
                flash(error, 'errors')

        else:
            if changed_parts:
                for part in changed_parts:
                    Db_Functions.update_table(burp.db_connection, 'users', {part: changed_parts[part]}, {'id': user_info['id']})
            
            if new_password:
                Db_Functions.update_table(burp.db_connection, 'password_hashes', {'password_hash': new_password_hash}, {'id': user_info['password_hash_id']})

            flash('your settings successfuly changed!', 'ok')
    
    else:
        flash('KIDDING ME???!', 'errors')
        # with js: until user haven't changed any parts, save button must be disabled

    return redirect(urls.DASHBOARD_SETTING + '/edit')

@burp.app.route(urls.SEARCH)
@burp.app.route(urls.DYNAMIC_SEARCH, methods=['POST'])
def search():
    search_inp = request.form['search_inp']

    while True:
        try:
            result = burp.search_between_files(search_inp)
        except:
            try:
                burp.db_connection.reconnect(10, 0.5)
            except:
                pass # cause i don't know why MYSQL give me such error
        else:
            break

    if 'search_query' in request.path:
        result_dict = {post.id: {'subject': post.subject, 'image_url': post.image_url} for post in result}
        return json.dumps(result_dict)
    else:
        return ('search.html')


@burp.app.route(urls.POST)
def post(post_id):
    post_ = burp.get_post(post_id)
    if not post_:
        abort(404, description="Post wasn't found!")

    tags_ = burp.posts_tags

    if 'user' in session:
        user_fullname_ = session['user'][1]
    else:
        user_fullname_ = None

    return render_template('post.html', post=post_, tags=tags_, page_name='post', user_fullname=user_fullname_)


@burp.app.route(urls.JS_AJAX, methods=['GET', 'POST'])
def js_query(query_type):
    if query_type == 'tags':
        tags = [tag for tag, _ in burp.posts_tags]
        result = {'tags': tags}
        return json.dumps(result)

    elif query_type == 'flash':
        message = request.form['message']
        return ''

@burp.app.route(urls.LOGOUT)
def logout():
    del session['user']
    return redirect(urls.HOME)


@burp.app.route(urls.INDEX)
@burp.app.route(urls.INDEX_HTML)
def get_page():
    return redirect(urls.HOME)


@burp.app.route(urls.FILE)
@burp.app.route(urls.FOLDER_FILE)
def get_file(file_name, folder_name=None):
    if not folder_name:
        file_path = r'{}'.format(file_name)
    else:
        file_path = r'{}/{}'.format(folder_name, file_name)

    with open(file_path, 'rb') as f:
        data = f.read()

    return data

if __name__ == '__main__':
    try:
        burp.app.run(host='localhost', debug=True)
    except (KeyboardInterrupt, mysql_error):
        burp.db_connection.close()
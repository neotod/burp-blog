import re
import configparser

from math import ceil
from time import time
from sys import exc_info
from hashlib import sha256
from os import remove, path

from scripts.database_stuff import Db_Functions
from mysql.connector import connect, Error, MySQLConnection

from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

from flask import Flask, session
import flask_uploads as fu

class Burp_Blog:
    def __init__(self):
        self.app = Flask('__main__') # check the arguments
        self.app.secret_key = b'\x8c\xc1\x070\xc3\xd5\xa6\xed\x0b\xd0\xa2\xa0s\xd1Z'
        self.app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024 # 2MB
        self.app.config['UPLOADED_IMAGES_DEST'] = '/images'

        self.images_uploadset = fu.UploadSet('images', fu.IMAGES)
        fu.configure_uploads(self.app, self.images_uploadset)

        self.app.jinja_env.autoescape = False

        self.db_connection = self.connect_to_db()
        self.db_connection.autocommit = True

        self.posts_tags = self.get_posts_tags()
        self.pages_num = self.get_pages_num()
        self.current_path = '/?'

    def connect_to_db(self):
        config = configparser.ConfigParser()
        config.read('config.ini')
        connection = connect(**config['mysql'])
        return connection

    def get_posts_tags(self):
        statement = '''
        SELECT c.name, COUNT(p_c.cat_id)
        FROM posts_cats AS p_c
        INNER JOIN cats AS c ON p_c.cat_id = c.id
        GROUP BY c.name;
        '''

        statement = '''
        SELECT c.name, 1 FROM cats AS c;
        '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement)
        tags = cursor.fetchall()
        tags = [(tag.lower(), _) for tag, _ in tags]

        cursor.close()
        return tags
    
    def get_post(self, post_id):
        cursor = self.db_connection.cursor()

        statement = f'''
        SELECT id, subject, preface, content, image_id, timestamp
        FROM posts
        WHERE id = {post_id}
        '''
        cursor.execute(statement)
        result = cursor.fetchall()

        if not result:
            return None

        row = result[0]
        p_id = row[0]
        p_subject = row[1]
        p_preface = row[2]
        p_content = row[3]
        p_image_id = row[4]
        p_timestamp = str(row[5])

        if p_image_id != None:
            statement = f'''
            SELECT name FROM images
            WHERE id = {p_image_id}
            '''
            cursor = self.db_connection.cursor()
            cursor.execute(statement)
            result = cursor.fetchall()

            row = result[0]
            p_image_url = '/images'+ f'/{row[0]}'

        else:
            p_image_url = None # post doesn't have an image

        statement = f'''
        SELECT c.name
        FROM posts_cats AS p_c
        INNER JOIN cats AS c ON c.id = p_c.cat_id
        WHERE p_c.post_id = {post_id}
        '''
        cursor.execute(statement)
        result = cursor.fetchall()
        p_tags = tuple([tag[0] for tag in result]) # pashmam

        post = Post(p_id, p_subject, p_preface, p_content, p_image_url, p_tags, p_timestamp)
        return post

    def get_posts(self, page_num=None, tag=None, username=None):
        offset = (page_num-1)*10
        last_id = Db_Functions.get_last_id(self.db_connection, 'posts')
        if last_id == None:
            return None

        start_id = last_id - offset
        end_id = start_id - 10 if start_id - 10 > 0 else 0

        posts = []
        for post_id in range(start_id, end_id, -1):
            post = self.get_post(post_id)
            if not post:
                continue

            posts.append(post)

        return posts

    def insert_post(self, subject, preface, content, image, author_username, tags):
        cursor = self.db_connection.cursor()
        try:
            image_id = None
            if image != None:
                image_name = image
                insert_columns = ('name', )
                insert_rows = ((image_name, ), )
                Db_Functions.insert_into_table(self.db_connection, 'images', insert_columns, insert_rows)

                statement = '''
                SELECT MAX(id) FROM images;
                '''
                cursor.execute(statement)
                result = cursor.fetchall()
                image_id = result[0][0]

            user_id = self.get_user_info(author_username)['id']
            edit_timestamp = None
            Db_Functions.insert_into_table(self.db_connection,
                                            'posts',
                                            ('subject', 'preface', 'content', 'image_id', 'author_id', 'editted_at'),
                                            ((subject, preface, content, image_id, user_id, edit_timestamp), )
            )

            last_post_id = Db_Functions.get_last_id(self.db_connection, 'posts')

            # insert post tags
            for tag in tags:
                tag_id = self.get_tag_id(tag)
                Db_Functions.insert_into_table(self.db_connection, 'posts_cats', ('post_id', 'cat_id'), ((last_post_id, tag_id), ))
        
        finally:
            cursor.close()

    def delete_post(self, post_id: int):
        cursor = self.db_connection.cursor()

        statement = f'''
        SELECT name FROM images WHERE id = (SELECT image_id FROM posts WHERE id = {post_id});
        '''
        cursor.execute(statement)
        result = cursor.fetchall()
        if result:
            image_name = result[0][0]
            image_address = path.join('images', image_name)

            try:
                remove(image_address)
            except: # somehow post image is deleted (db error and stuff)
                pass
        
        Db_Functions.set_foreign_key_check(self.db_connection, False)
        Db_Functions.delete_from_table(self.db_connection, 'posts_cats', {'post_id': post_id}, 'post_id')

        statement = f'''
        DELETE FROM images WHERE id = (SELECT image_id FROM posts WHERE id = {post_id});
        '''
        cursor.execute(statement)

        Db_Functions.delete_from_table(self.db_connection, 'posts', {'id': post_id}, 'id')
        Db_Functions.set_foreign_key_check(self.db_connection, True)

        cursor.close()

    def update_post(self, post_id, changed_parts):
        cursor = self.db_connection.cursor()
        
        for changed_part in changed_parts:
            if changed_part == 'image_url':
                statement = '''
                SELECT image_id FROM posts
                WHERE id = %s;
                '''

                values = (post_id, )
                cursor.execute(statement, values)
                result = cursor.fetchall()
                image_id = int(result[0][0]) if result[0][0] else None
                
                if changed_parts['image_url']:
                    new_image_name = changed_parts['image_url'].split('/')[-1]
                else:
                    new_image_name = None # user wants to delete post image

                if new_image_name:
                    if image_id: # update post image
                        Db_Functions.set_foreign_key_check(self.db_connection, False)
                        Db_Functions.update_table(self.db_connection, 'images', {'name': new_image_name}, condition={'id': image_id})
                        Db_Functions.update_table(self.db_connection, 'posts', {'image_id': image_id}, condition={'id': post_id})
                        Db_Functions.set_foreign_key_check(self.db_connection, True)

                    else: # post doesn't have an image and user want it to have image
                        Db_Functions.set_foreign_key_check(self.db_connection, False)
                        Db_Functions.insert_into_table(self.db_connection, 'images', ('name', ), ((new_image_name, ), ))
                        image_id = Db_Functions.get_last_id(self.db_connection, 'images')
                        Db_Functions.update_table(self.db_connection, 'posts', {'image_id': image_id}, {'id': post_id})
                        Db_Functions.set_foreign_key_check(self.db_connection, True)

                else: # user wants to delete post image
                        Db_Functions.set_foreign_key_check(self.db_connection, False)
                        Db_Functions.delete_from_table(self.db_connection, 'images', {'id': image_id}, 'id')
                        Db_Functions.update_table(self.db_connection, 'posts', {'image_id': None}, {'id': post_id})
                        Db_Functions.set_foreign_key_check(self.db_connection, True)
        
            elif 'tags' == changed_part:
                Db_Functions.delete_from_table(self.db_connection, 'posts_cats', {'post_id': post_id}, 'post_id')

                for tag in changed_parts['tags']:
                    tag_id = self.get_tag_id(tag)
                    Db_Functions.insert_into_table(self.db_connection, 'posts_cats', ('post_id', 'cat_id'), ((post_id, tag_id), ))

            elif ('subject' == changed_part) or ('preface' == changed_part) or ('content' == changed_part):
                chnaged_columns = tuple([column for column in changed_parts if column in ['subject', 'preface', 'content']])

                for column in chnaged_columns:
                    Db_Functions.update_table(self.db_connection, 'posts', {column: Db_Functions.inject_escape_chars(changed_parts[column])}, {'id': post_id})

        cursor.close()

    def search_between_files(self, search_inp):
        statement = '''
        SELECT id, subject FROM posts;
        '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement)
        result = cursor.fetchall()

        matched_posts = {}
        for p_id, p_subject in result:
            lower_subject = p_subject.lower()
            matching_res = re.findall(f'{search_inp.lower()}', lower_subject)

            if matching_res:
                matched_nums = len(matching_res)
                matched_posts[p_id] = matched_nums
        
        matched_posts = {k: matched_posts[k] for k in sorted(matched_posts.keys(), key=lambda key : matched_posts[key], reverse=True)}
        matched_posts_ids = matched_posts.keys()

        matched_posts = []
        for p_id in matched_posts_ids:
            post = self.get_post(p_id)
            matched_posts.append(post)

        cursor.close()
        return matched_posts
        
    def get_pages_num(self, tag=None):
        if not tag:
            statement = '''
            SELECT COUNT(id) FROM posts;
            '''
        else:
            statement = '''
            SELECT COUNT(post_id) FROM posts_cats AS p_c
            INNER JOIN cats AS c ON p_c.cat_id = c.id
            '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement)
        result = cursor.fetchall()

        if result == None:
            return 0

        pages_num = ceil(result[0][0] / 10)
        cursor.close()
        return pages_num

    def get_tag_id(self, tag):
        statement = '''
        SELECT id FROM cats
        WHERE name = %s;
        '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement, (tag, ))
        tag_id = cursor.fetchall()[0][0]
        return tag_id


    def validate_login(self, username, password):
        cursor = self.db_connection.cursor()

        statement = '''
        SELECT username FROM users
        WHERE username = %s;
        '''
        cursor.execute(statement, (username, ))
        result = cursor.fetchall()

        if result:
            user_valid = True
        else:
            user_valid = False

        
        pass_valid = None
        if user_valid:
            password_hash = self.get_password_hash(password)

            statement = '''
            SELECT p_h.password_hash FROM users AS u
            INNER JOIN password_hashes AS p_h ON u.password_hash_id = p_h.id
            WHERE u.username = %s;
            '''
            cursor.execute(statement, (username, ))
            result = cursor.fetchall()
            real_password_hash = result[0][0]

            if password_hash == real_password_hash:
                pass_valid = True
            else:
                pass_valid = False

        result_dict = {'uvalid': user_valid, 'pvalid': pass_valid}

        cursor.close()
        return result_dict

    def validate_register(self, username: str, password: str, r_password: str, email: str):
        errors = []

        username_errors = []
        if username:
            # username check:
            valid_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'
            for char in username:
                if char not in valid_chars:
                    errors.append("Can't use invalid characters in your username, only can use [a-z, A-Z, 0-9, _] !")
                    break
            
            if len(username_errors) == 0:
                statement = '''
                SELECT username FROM users
                WHERE username = %s;
                '''
                cursor = self.db_connection.cursor()
                cursor.execute(statement, (username,))
                result = cursor.fetchall()
                cursor.close()
                
                if result:
                    errors.append('An username as same as yours exists, try login or try a different username!')
                    


        password_errors = []
        if password:
            # password check
            if len(password) < 5:
                errors.append('Your password must be more than 5 characters!')
            
            if password != r_password:
                errors.append('Your password and repeated password are not the same!')
            

        email_error = ''
        if email:
            # email check
            email = email.lower()
            statement = '''
            SELECT email FROM users
            WHERE email = %s;
            '''
            cursor = self.db_connection.cursor()
            cursor.execute(statement, (email,))
            result = cursor.fetchall()
            cursor.close()

            if result:
                errors.append('An email as same as your email exists, try login or try a different email!')

        return errors

    def create_user(self, name, lastname, username, password, email):
        cursor = self.db_connection.cursor()

        # note: you can add encryption here for password_len
        password_len = len(password)

        password_hash = self.get_password_hash(password)

        Db_Functions.insert_into_table(self.db_connection, 'password_hashes', ('password_hash', 'password_len'), ((password_hash, password_len),))

        last_insert_id = Db_Functions.get_last_id(self.db_connection, 'password_hashes')
        Db_Functions.insert_into_table(self.db_connection, 
                                      'users',
                                      ('name_', 'lastname', 'username', 'password_hash_id', 'email'),
                                      ((name, lastname, username, last_insert_id, email), ))

        cursor.close()

    def get_user_fullname(self, username):
        statement = '''
        SELECT name_, lastname FROM users
        WHERE username = %s;
        '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement, (username, ))

        result = cursor.fetchall()
        name = result[0][0]
        lastname = result[0][1]

        fullname = f'{name} {lastname}'
        if len(fullname) > 25:
            fullname = fullname[22] + '...'

        cursor.close()
        return fullname

    def get_user_info(self, username):
        statement = '''
        SELECT u.id, u.name_, u.lastname, u.username, u.password_hash_id, p_h.password_hash, p_h.password_len, u.email
        FROM users AS u
        INNER JOIN password_hashes AS p_h ON p_h.id = u.password_hash_id 
        WHERE u.username = %s
        '''

        cursor = self.db_connection.cursor()
        cursor.execute(statement, (username, ))

        result = cursor.fetchall()
        
        info_dict = {}
        info_dict['id'] = result[0][0]
        info_dict['name_'] = result[0][1]
        info_dict['lastname'] = result[0][2]
        info_dict['username'] = result[0][3]
        info_dict['password_hash_id'] = result[0][4]
        info_dict['password_hash'] = result[0][5]
        info_dict['password_len'] = result[0][6]
        info_dict['email'] = result[0][7]

        cursor.close()
        return info_dict

    def get_user_all_posts(self, username, sort_by_timestamp=False):
        statement = '''
        SELECT p.id FROM posts AS p
        INNER JOIN users AS u ON p.author_id = u.id
        WHERE u.username = %s
        '''
        if sort_by_timestamp:
            statement += '\n ORDER BY timestamp DESC;'

        cursor = self.db_connection.cursor()
        cursor.execute(statement, (username, ))
        
        result = cursor.fetchall()

        posts = []
        for post_id in result:
            post = self.get_post(post_id[0])
            posts.append(post)

        cursor.close()
        return posts

    def save_file(self, filestorage: FileStorage, save_path: str, valid_type: str):
        filename = secure_filename(filestorage.filename)

        valid_types_list = []
        if valid_type == 'image':
            valid_types_list = fu.IMAGES
        elif valid_type == 'audio':
            valid_types_list = fu.AUDIO

        filetype = filename.split('.')[-1]
        if filetype in valid_types_list:
            save_path = path.join(save_path, filename)
            filestorage.save(save_path)
        else:
            raise fu.UploadNotAllowed
    
    def get_result_gen(self, cursor):
        while True:
            row = cursor.fetchone()
            yield row

    def get_password_hash(self, password):
        return sha256(password.encode()).hexdigest()

    def get_item_changed_parts(self, prev_items: dict, new_items: dict):
        changed_parts = {}
        for item in new_items:
            if prev_items[item] != new_items[item]:
                changed_parts[item] = new_items[item]
        
        return changed_parts

class Post():
    def __init__(self, id_: int, subject: str, preface: str, content: str, image_url: str, tags: list, timestamp: str):
        self.id = id_
        self.subject = subject
        self.content = content

        if preface:
            self.preface = preface
        else:
            self.preface = self.get_preface()

        self.image_url = image_url
        self.tags = tags
        self.timestamp = timestamp
        self.url = f'/post-{self.id}'

    def get_preface(self):
        complete_content = self.content
        return complete_content[:500] + '...'

    def get_rendered_content(self, content):
        r_content = []
        tag = []
        i = 0
        plain_content = ''
        while i < len(content):
            char = content[i]
            if char == '{':
                r_content.append((plain_content, 'plain'))
                plain_content = ''

                tag_start = tag_content = tag_end = ''
                tag_start += char
                i += 1
                phase = 'start'
                while True:
                    char = content[i]
                    if phase == 'start':
                        tag_start += char
                        if char == '}':
                            phase = 'content'

                    elif phase == 'content':
                        if char != '{':
                            tag_content += char
                        else:
                            phase = 'end'
                            tag_end += char

                    elif phase == 'end':
                        tag_end += char
                        if char == '}':
                            i += 1
                            char = content[i]
                            break

                    i += 1
                
                tag_type = tag_end[1:-1]
                if tag_type == 'i':
                    r_content.append((tag_content, 'italic'))
                elif tag_type == 'b':
                    r_content.append((tag_content, 'bold'))
                

            plain_content += char
            i += 1
        
        r_content.append((plain_content, 'plain'))

        return r_content
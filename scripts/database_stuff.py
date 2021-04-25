from mysql.connector import MySQLConnection

class Db_Functions:

    @staticmethod
    def inject_escape_chars(string: str):
        final_string = ''
        for char in string:
            if char == '\'':
                final_string += "\\\'"
            elif char == '\"':
                final_string += '\\\"'
            else:
                final_string += char
        
        return final_string

    @staticmethod
    def insert_into_table(connection: MySQLConnection, table_name: str, columns: tuple, rows: tuple):
        cursor = connection.cursor()
        columns = ', '.join(columns)
        
        statement = f'''
        INSERT INTO `{table_name}`({columns})
        VALUES '''
        
        for j in range(len(rows)):
            row = rows[j]

            values_str = '('
            for i in range(len(row)):
                value = row[i]
                if (type(value) is str) and ('\"' or '\'' in value):
                    value = Db_Functions.inject_escape_chars(value)

                if type(value) is int:
                    values_str += f'{str(value)}, '
                elif type(value) is str:
                    values_str += f"'{value}', "
                elif not value:
                    values_str += 'NULL, '

            values_str = values_str[:-2]
            values_str += ')'

            if j != len(row)-1 and j != 0:
                values_str += ',\n'
            else:
                values_str += ';'

            statement += values_str

        cursor.execute(statement)
        cursor.close()

    @staticmethod
    def delete_from_table(connection: MySQLConnection, table_name: str, condition: dict, update_ai:bool=False, ai_column_name:str='id'):
        statement = f'''
        DELETE FROM `{table_name}`
        WHERE
        '''
        
        condition_str = ''
        for column in condition:
            condition_val = condition[column]
            condition_val_type = type(condition_val)
            if condition_val_type == str or condition_val_type == int or len(condition_val) == 1:
                if condition_val_type == str:
                    condition_str += f" `{column}` = '{condition_val}' AND"
                else:
                    condition_str += f" `{column}` = {condition_val} AND"

            else:
                condition_str += f' `{column}` IN {condition_val} AND'

        condition_str = condition_str[:-4] # for removing extra AND
        statement += (condition_str + ';')
        
        if update_ai :
            temp_statement = f'''
            SELECT {ai_column_name} FROM {table_name} WHERE
            '''
            temp_statement += (condition_str + ';')

            cursor = connection.cursor()
            cursor.execute(temp_statement)

            item_id = cursor.fetchall()[0][0]

        cursor = connection.cursor()
        cursor.execute(statement)
        cursor.close()

        if update_ai:
            statement = f'''
            ALTER TABLE {table_name} AUTO_INCREMENT={item_id}
            '''

            cursor = connection.cursor()
            cursor.execute(statement)
            cursor.close()


    @staticmethod
    def update_table(connection: MySQLConnection, table_name: str, setting_columns: dict, condition: dict=None):
        statement = f'''
        UPDATE `{table_name}`
        SET 
        '''

        for column in setting_columns:
            set_value = setting_columns[column]
            if type(set_value) is int:
                set_string = f"`{column}` = {set_value}, "

            elif type(set_value) is str:
                set_string = f"`{column}` = \'{set_value}\', "

            elif not set_value:
                set_string = f"`{column}` = NULL, "
            
        set_string = set_string[:-2]
        statement += set_string

        if condition:
            condition_str = '\nWHERE'
            for column in condition:
                condition_val = condition[column]
                condition_val_type = type(condition_val)
                if condition_val_type == str or condition_val_type == int or len(condition_val) == 1:
                    if condition_val_type == str:
                        condition_str += f" `{column}` = '{condition_val}' AND"
                    else:
                        condition_str += f" `{column}` = {condition_val} AND"

                else:
                    condition_str += f' `{column}` IN {condition_val} AND'

            condition_str = condition_str[:-4]
            statement += condition_str

        statement += ';'


        cursor = connection.cursor()
        cursor.execute(statement)
        cursor.close()

    @staticmethod
    def set_foreign_key_check(connection: MySQLConnection, value: bool):
        if value:
            statement = '''
            SET FOREIGN_KEY_CHECKS = 1;
            '''
        else:
            statement = '''
            SET FOREIGN_KEY_CHECKS = 0;
            '''

        cursor = connection.cursor()
        cursor.execute(statement)
        cursor.close()

    @staticmethod
    def get_last_id(connection: MySQLConnection, table_name: str):
        statement = f'''
        SELECT MAX(id) FROM {table_name};
        '''

        cursor = connection.cursor()
        cursor.execute(statement)
        result = cursor.fetchall()
        
        if result[0][0] == None:
            return 0

        cursor.close()
        return int(result[0][0])